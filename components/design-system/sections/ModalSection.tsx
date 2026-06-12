'use client'

import React, { useState } from 'react'
import { SectionShell } from '../SectionShell'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export function ModalSection() {
  return (
    <SectionShell
      id="modal"
      title="Modal"
      description="Dialogs from components/ui/dialog (Radix). Use for confirmations, quick forms, and detail views that don't need a full page. Always include a clear title and a dismiss action."
      useCases={{
        use: ['Confirmation dialogs before destructive actions', 'Short forms that don\'t need a full page', 'Alert detail view on mobile'],
        avoid: ['Complex multi-step flows — use a dedicated page', 'Content that exceeds 80% of viewport height — use a sheet or page instead'],
      }}
      sampleCode={`import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

<Dialog>
  <DialogTrigger asChild>
    <Button variant="outline">Ver detalle</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Alerta #001</DialogTitle>
      <DialogDescription>Movimiento detectado en Zona Norte</DialogDescription>
    </DialogHeader>
    <p className="text-sm text-ds-ink-body">Detalles de la alerta...</p>
    <DialogFooter>
      <Button variant="outline">Cerrar</Button>
      <Button>Resolver</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>`}
      options={
        <div className="flex flex-wrap gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">Destructive confirm</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>¿Eliminar expediente?</DialogTitle>
                <DialogDescription>Esta acción no se puede deshacer. El expediente y todos sus registros serán eliminados permanentemente.</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline">Cancelar</Button>
                <Button variant="destructive">Eliminar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline">Ver detalle de alerta</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alerta #001 — Zona Norte</DialogTitle>
            <DialogDescription>Movimiento detectado · 09:42 · Cámara CAM-04</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-ds-ink-body">
              Se detectó movimiento en el perímetro norte del parque industrial. La cámara CAM-04 registró actividad a las 09:42. Sin personal autorizado en la zona en ese horario.
            </p>
            <div className="flex gap-4 text-xs text-ds-ink-muted">
              <span>Zona: Norte</span>
              <span>Criticidad: Alta</span>
              <span>Operario: López</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline">Escalar</Button>
            <Button>Resolver</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionShell>
  )
}
