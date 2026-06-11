const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

function loadEscalationModule() {
  const filename = path.resolve(__dirname, '../lib/escalation.ts')
  const source = fs.readFileSync(filename, 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filename,
  }).outputText

  const module = { exports: {} }
  const execute = new Function('module', 'exports', 'require', compiled)
  execute(module, module.exports, require)
  return module.exports
}

const {
  buildEscalationObservation,
  getEscalationRoles,
  showEscalationActions,
  toTelHref,
} = loadEscalationModule()

function readMockRuleEscalationConfig() {
  const filename = path.resolve(__dirname, '../lib/mock-data.ts')
  const source = fs.readFileSync(filename, 'utf8')
  const sourceFile = ts.createSourceFile(
    filename,
    source,
    ts.ScriptTarget.ES2022,
    true,
    ts.ScriptKind.TS
  )

  const declaration = sourceFile.statements
    .filter(ts.isVariableStatement)
    .flatMap(statement => [...statement.declarationList.declarations])
    .find(item => ts.isIdentifier(item.name) && item.name.text === 'MOCK_RULES')

  if (!declaration || !declaration.initializer || !ts.isArrayLiteralExpression(declaration.initializer)) {
    throw new Error('No se encontró el arreglo MOCK_RULES')
  }

  return declaration.initializer.elements.map(element => {
    if (!ts.isObjectLiteralExpression(element)) {
      throw new Error('MOCK_RULES contiene un elemento no soportado')
    }

    const properties = new Map(
      element.properties
        .filter(ts.isPropertyAssignment)
        .map(property => [property.name.getText(sourceFile), property.initializer])
    )
    const id = properties.get('id')
    const canEscalate = properties.get('can_escalate')
    const roles = properties.get('escalation_roles')

    return {
      id: id && ts.isNumericLiteral(id) ? Number(id.text) : null,
      can_escalate:
        canEscalate?.kind === ts.SyntaxKind.TrueKeyword
          ? true
          : canEscalate?.kind === ts.SyntaxKind.FalseKeyword
            ? false
            : null,
      escalation_roles:
        roles && ts.isArrayLiteralExpression(roles)
          ? roles.elements
              .filter(ts.isStringLiteral)
              .map(role => role.text)
          : null,
    }
  })
}

describe('workflow de escalación', () => {
  test('muestra acciones de escalación para alertas en revisión o pendientes cuando la regla lo permite', () => {
    const baseAlert = {
      status: 'en_revision',
      rule: {
        can_escalate: true,
        escalation_roles: ['responsable_seguridad'],
      },
    }

    expect(showEscalationActions(baseAlert)).toBe(true)
    expect(showEscalationActions({ ...baseAlert, status: 'pendiente' })).toBe(true)
    expect(
      showEscalationActions({
        ...baseAlert,
        rule: { ...baseAlert.rule, can_escalate: false },
      })
    ).toBe(false)
  })

  test('también expone acciones de escalación cuando el detalle entra por deep-link pendiente y escalable', () => {
    expect(
      showEscalationActions({
        status: 'pendiente',
        rule: {
          can_escalate: true,
          escalation_roles: ['responsable_seguridad'],
        },
      })
    ).toBe(true)
  })

  test('usa únicamente roles de escalación autorizados y definidos por la regla', () => {
    expect(
      getEscalationRoles({
        can_escalate: true,
        escalation_roles: ['responsable_seguridad', 'vigilante', 'soporte_tns'],
      })
    ).toEqual(['responsable_seguridad', 'soporte_tns'])

    expect(
      getEscalationRoles({
        can_escalate: false,
        escalation_roles: ['responsable_seguridad'],
      })
    ).toEqual([])
  })

  test('concatena checklist y observación en un payload auditable', () => {
    expect(
      buildEscalationObservation(
        ['Llamé a Carabineros (133)', 'Revisé cámaras adicionales del sector'],
        '  Guardia en camino  '
      )
    ).toBe(
      [
        'Acciones previas realizadas:',
        '- Llamé a Carabineros (133)',
        '- Revisé cámaras adicionales del sector',
        '',
        'Observación del operador:',
        'Guardia en camino',
      ].join('\n')
    )

    expect(buildEscalationObservation([], '   ')).toBeUndefined()
  })

  test('normaliza teléfonos para enlaces tel', () => {
    expect(toTelHref('+56 9 8821 4430')).toBe('tel://+56988214430')
  })

  test('configura las reglas mock escalables según la especificación', () => {
    const expectedEscalation = new Map([
      [1, true],
      [2, true],
      [3, false],
      [4, true],
      [5, false],
      [6, false],
      [7, true],
      [8, true],
      [9, false],
    ])

    const mockRules = readMockRuleEscalationConfig()
    expect(mockRules).toHaveLength(9)

    for (const rule of mockRules) {
      const canEscalate = expectedEscalation.get(rule.id)
      expect(rule.can_escalate).toBe(canEscalate)
      expect(rule.escalation_roles).toEqual(
        canEscalate ? ['responsable_seguridad', 'admin_parque'] : []
      )
    }
  })
})
