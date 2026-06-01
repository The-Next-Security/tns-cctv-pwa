import { MOCK_CAMERAS, MOCK_TENANTS, MOCK_VEHICLE_ENTRIES } from './mock-data'
import { DEMO_EVIDENCE_SPEED_URL } from './demo-media'
import type { CaseFile, CaseResolution, MatchStatus, PaginatedResponse } from './types'

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
}

function buildInitialCases(): CaseFile[] {
  const entry1 = MOCK_VEHICLE_ENTRIES[0]
  const entry2 = MOCK_VEHICLE_ENTRIES[1]
  const entry4 = MOCK_VEHICLE_ENTRIES[3]

  return [
    {
      id: 1,
      case_number: 'EXP-2026-0042',
      infraction_id: 1,
      match_status: 'match_confiable',
      matched_entry_id: entry1.id,
      candidate_entry_ids: [entry1.id],
      tenant_id: entry1.tenant_id,
      resolution: 'pendiente',
      resolved_by: null,
      resolved_at: null,
      resolution_note: null,
      notification_sent_at: null,
      created_at: hoursAgo(1.5),
      tenant: entry1.tenant,
      matched_entry: entry1,
      infraction: {
        id: 1,
        alert_id: 2,
        source: 'anpr_external',
        plate_read: 'BCDF-12',
        plate_read_normalized: 'BCDF12',
        infraction_type: 'exceso_velocidad',
        speed_kmh: 72,
        speed_limit_kmh: 40,
        detected_at: hoursAgo(1.5),
        camera_id: 2,
        evidence_url: DEMO_EVIDENCE_SPEED_URL,
        camera: MOCK_CAMERAS[1],
      },
    },
    {
      id: 2,
      case_number: 'EXP-2026-0041',
      infraction_id: 2,
      match_status: 'revision_manual',
      matched_entry_id: null,
      candidate_entry_ids: [entry2.id, entry4.id],
      tenant_id: null,
      resolution: 'pendiente',
      resolved_by: null,
      resolved_at: null,
      resolution_note: null,
      notification_sent_at: null,
      created_at: hoursAgo(3),
      candidate_entries: [entry2, entry4],
      infraction: {
        id: 2,
        alert_id: null,
        source: 'anpr_external',
        plate_read: 'WXYZ-98',
        plate_read_normalized: 'WXYZ98',
        infraction_type: 'exceso_velocidad',
        speed_kmh: 58,
        speed_limit_kmh: 40,
        detected_at: hoursAgo(3),
        camera_id: 2,
        evidence_url: DEMO_EVIDENCE_SPEED_URL,
        camera: MOCK_CAMERAS[1],
      },
    },
    {
      id: 3,
      case_number: 'EXP-2026-0040',
      infraction_id: 3,
      match_status: 'sin_coincidencia',
      matched_entry_id: null,
      candidate_entry_ids: [],
      tenant_id: null,
      resolution: 'pendiente',
      resolved_by: null,
      resolved_at: null,
      resolution_note: null,
      notification_sent_at: null,
      created_at: hoursAgo(5),
      infraction: {
        id: 3,
        alert_id: null,
        source: 'anpr_external',
        plate_read: 'RSTU-77',
        plate_read_normalized: 'RSTU77',
        infraction_type: 'exceso_velocidad',
        speed_kmh: 65,
        speed_limit_kmh: 40,
        detected_at: hoursAgo(5),
        camera_id: 2,
        evidence_url: DEMO_EVIDENCE_SPEED_URL,
        camera: MOCK_CAMERAS[1],
      },
    },
    {
      id: 4,
      case_number: 'EXP-2026-0038',
      infraction_id: 4,
      match_status: 'match_confiable',
      matched_entry_id: MOCK_VEHICLE_ENTRIES[2].id,
      candidate_entry_ids: [MOCK_VEHICLE_ENTRIES[2].id],
      tenant_id: MOCK_VEHICLE_ENTRIES[2].tenant_id,
      resolution: 'notificado',
      resolved_by: 1,
      resolved_at: hoursAgo(20),
      resolution_note: 'Correo enviado a arrendatario DisNorte',
      notification_sent_at: hoursAgo(20),
      created_at: hoursAgo(22),
      tenant: MOCK_VEHICLE_ENTRIES[2].tenant,
      matched_entry: MOCK_VEHICLE_ENTRIES[2],
      infraction: {
        id: 4,
        alert_id: null,
        source: 'anpr_external',
        plate_read: 'LMNO-45',
        plate_read_normalized: 'LMNO45',
        infraction_type: 'exceso_velocidad',
        speed_kmh: 54,
        speed_limit_kmh: 40,
        detected_at: hoursAgo(22),
        camera_id: 2,
        evidence_url: DEMO_EVIDENCE_SPEED_URL,
        camera: MOCK_CAMERAS[1],
      },
    },
    {
      id: 5,
      case_number: 'EXP-2026-0035',
      infraction_id: 5,
      match_status: 'fuera_ventana',
      matched_entry_id: null,
      candidate_entry_ids: [MOCK_VEHICLE_ENTRIES[4].id],
      tenant_id: MOCK_TENANTS[5].id,
      resolution: 'desestimado',
      resolved_by: 1,
      resolved_at: hoursAgo(30),
      resolution_note: 'Ingreso registrado fuera de ventana horaria de correlación',
      notification_sent_at: null,
      created_at: hoursAgo(32),
      tenant: MOCK_TENANTS[5],
      candidate_entries: [MOCK_VEHICLE_ENTRIES[4]],
      infraction: {
        id: 5,
        alert_id: null,
        source: 'anpr_external',
        plate_read: 'QRST-23',
        plate_read_normalized: 'QRST23',
        infraction_type: 'exceso_velocidad',
        speed_kmh: 49,
        speed_limit_kmh: 40,
        detected_at: hoursAgo(32),
        camera_id: 2,
        evidence_url: DEMO_EVIDENCE_SPEED_URL,
        camera: MOCK_CAMERAS[1],
      },
    },
  ]
}

let casesStore: CaseFile[] = buildInitialCases()

/** Vuelve expedientes mock al estado inicial (p. ej. reiniciar demo). */
export function resetMockCaseFilesStore(): void {
  casesStore = buildInitialCases()
}

function filterCases(params?: {
  status?: string
  match_status?: string
  tenant_id?: number
  plate?: string
}): CaseFile[] {
  return casesStore.filter(caseFile => {
    if (params?.status && params.status !== 'all' && caseFile.resolution !== params.status) {
      return false
    }
    if (params?.match_status && params.match_status !== 'all' && caseFile.match_status !== params.match_status) {
      return false
    }
    if (params?.tenant_id && caseFile.tenant_id !== params.tenant_id) {
      return false
    }
    if (params?.plate) {
      const needle = params.plate.toUpperCase().replace(/[^A-Z0-9]/g, '')
      const hay = caseFile.infraction?.plate_read_normalized ?? ''
      if (!hay.includes(needle)) return false
    }
    return true
  })
}

export const mockCaseFilesApi = {
  list(params?: {
    status?: string
    match_status?: string
    from?: string
    to?: string
    tenant_id?: number
    plate?: string
    page?: number
    pageSize?: number
  }): PaginatedResponse<CaseFile> {
    const filtered = filterCases(params)
    const page = params?.page ?? 1
    const pageSize = params?.pageSize ?? 50
    const start = (page - 1) * pageSize

    return {
      data: filtered.slice(start, start + pageSize),
      pagination: {
        page,
        pageSize,
        total: filtered.length,
      },
    }
  },

  get(id: number): CaseFile {
    const found = casesStore.find(c => c.id === id)
    if (!found) {
      throw new Error('Expediente no encontrado')
    }
    return structuredClone(found)
  },

  resolve(
    id: number,
    data: {
      resolution: CaseResolution
      resolution_note?: string
      selected_entry_id?: number
    }
  ): CaseFile {
    const index = casesStore.findIndex(c => c.id === id)
    if (index === -1) throw new Error('Expediente no encontrado')

    const current = casesStore[index]
    let matchedEntry = current.matched_entry
    let tenant = current.tenant
    let matchStatus: MatchStatus = current.match_status

    if (data.selected_entry_id) {
      const entry = MOCK_VEHICLE_ENTRIES.find(e => e.id === data.selected_entry_id)
      if (entry) {
        matchedEntry = entry
        tenant = entry.tenant
        matchStatus = 'match_confiable'
      }
    }

    const updated: CaseFile = {
      ...current,
      resolution: data.resolution,
      resolution_note: data.resolution_note ?? current.resolution_note,
      matched_entry_id: data.selected_entry_id ?? current.matched_entry_id,
      matched_entry: matchedEntry,
      tenant_id: tenant?.id ?? current.tenant_id,
      tenant,
      match_status: matchStatus,
      resolved_by: 1,
      resolved_at: new Date().toISOString(),
    }

    casesStore[index] = updated
    return structuredClone(updated)
  },

  notifyTenant(id: number): void {
    const index = casesStore.findIndex(c => c.id === id)
    if (index === -1) throw new Error('Expediente no encontrado')

    casesStore[index] = {
      ...casesStore[index],
      notification_sent_at: new Date().toISOString(),
      resolution: 'notificado',
      resolved_at: casesStore[index].resolved_at ?? new Date().toISOString(),
      resolved_by: casesStore[index].resolved_by ?? 1,
    }
  },
}

export const mockTenantsApi = {
  list: () => Promise.resolve(MOCK_TENANTS),
}
