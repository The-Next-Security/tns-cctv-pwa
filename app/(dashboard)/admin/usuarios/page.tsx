'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Plus, Edit2, Trash2, Search, Users, UserCheck, UserX } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { MOCK_USERS } from '@/lib/mock-data'
import { ROLE_LABELS } from '@/lib/types'
import type { UserRole } from '@/lib/types'

interface Usuario {
  id: string
  nombre: string
  email: string
  role: UserRole
  activo: boolean
  ultimaConexion: string
}

const roles: UserRole[] = ['admin_parque', 'supervisor', 'vigilante', 'recepcionista', 'tecnico', 'visualizador', 'recepcion', 'responsable_seguridad', 'soporte_tns']

const getRoleColor = (role: UserRole) => {
  const colors: Record<UserRole, string> = {
    admin_parque: 'bg-red-500/10 text-red-500 border-red-500/30',
    supervisor: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
    vigilante: 'bg-green-500/10 text-green-500 border-green-500/30',
    recepcionista: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
    tecnico: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
    visualizador: 'bg-gray-500/10 text-gray-500 border-gray-500/30',
    recepcion: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30',
    responsable_seguridad: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30',
    soporte_tns: 'bg-pink-500/10 text-pink-500 border-pink-500/30',
  }
  return colors[role] || 'bg-gray-500/10 text-gray-500'
}

interface UserFormData {
  nombre: string
  email: string
  role: UserRole
  password: string
  activo: boolean
}

const defaultFormData: UserFormData = {
  nombre: '',
  email: '',
  role: 'vigilante',
  password: '',
  activo: true,
}

export default function UsuariosPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [usuarios, setUsuarios] = useState<Usuario[]>(
    MOCK_USERS.map(u => ({
      id: String(u.id),
      nombre: u.nombre || '',
      email: u.email,
      role: u.role,
      activo: u.activo ?? true,
      ultimaConexion: u.ultimaConexion || new Date().toISOString(),
    }))
  )
  const [editSheet, setEditSheet] = useState(false)
  const [editingUser, setEditingUser] = useState<Usuario | null>(null)
  const [formData, setFormData] = useState<UserFormData>(defaultFormData)
  const [deleteDialog, setDeleteDialog] = useState<Usuario | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const filteredUsuarios = usuarios.filter(
    (u) =>
      u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const stats = {
    total: usuarios.length,
    activos: usuarios.filter(u => u.activo).length,
    inactivos: usuarios.filter(u => !u.activo).length,
  }

  function handleNewUser() {
    setEditingUser(null)
    setFormData(defaultFormData)
    setEditSheet(true)
  }

  function handleEditUser(user: Usuario) {
    setEditingUser(user)
    setFormData({
      nombre: user.nombre,
      email: user.email,
      role: user.role,
      password: '',
      activo: user.activo,
    })
    setEditSheet(true)
  }

  function handleSubmit() {
    if (!formData.nombre.trim() || !formData.email.trim()) {
      toast.error('Nombre y email son requeridos')
      return
    }

    if (!editingUser && !formData.password) {
      toast.error('La contraseña es requerida para nuevos usuarios')
      return
    }

    setIsSubmitting(true)
    setTimeout(() => {
      if (editingUser) {
        setUsuarios(prev => prev.map(u => 
          u.id === editingUser.id 
            ? { ...u, nombre: formData.nombre, email: formData.email, role: formData.role, activo: formData.activo }
            : u
        ))
        toast.success('Usuario actualizado')
      } else {
        const newUser: Usuario = {
          id: String(usuarios.length + 1),
          nombre: formData.nombre,
          email: formData.email,
          role: formData.role,
          activo: formData.activo,
          ultimaConexion: new Date().toISOString(),
        }
        setUsuarios(prev => [...prev, newUser])
        toast.success('Usuario creado')
      }
      setIsSubmitting(false)
      setEditSheet(false)
    }, 500)
  }

  function handleDelete() {
    if (!deleteDialog) return
    setUsuarios(prev => prev.filter(u => u.id !== deleteDialog.id))
    toast.success('Usuario eliminado')
    setDeleteDialog(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuarios</h1>
          <p className="text-muted-foreground">Gestiona usuarios, roles y permisos</p>
        </div>
        <Button onClick={handleNewUser} className="touch-target">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Usuario
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.activos}</p>
                <p className="text-sm text-muted-foreground">Activos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <UserX className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.inactivos}</p>
                <p className="text-sm text-muted-foreground">Inactivos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o email..."
          className="pl-10 h-11"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Lista de Usuarios ({filteredUsuarios.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Ultima Conexion</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsuarios.map((usuario) => (
                  <TableRow key={usuario.id} className="animate-fade-in">
                    <TableCell className="font-medium">{usuario.nombre}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{usuario.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(getRoleColor(usuario.role))}>
                        {ROLE_LABELS[usuario.role]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={usuario.activo ? 'default' : 'secondary'}>
                        {usuario.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(usuario.ultimaConexion), { addSuffix: true, locale: es })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => handleEditUser(usuario)}
                          className="touch-target"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-destructive touch-target"
                          onClick={() => setDeleteDialog(usuario)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit/Create Sheet */}
      <Sheet open={editSheet} onOpenChange={setEditSheet}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader className="pb-6">
            <SheetTitle className="text-xl">
              {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
            </SheetTitle>
            <SheetDescription>
              {editingUser
                ? 'Modifique los datos del usuario'
                : 'Complete los datos para crear un nuevo usuario'
              }
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 px-1">
            {/* Nombre */}
            <div className="space-y-3">
              <Label htmlFor="nombre" className="text-sm font-medium">
                Nombre completo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Juan Perez"
                className="h-11"
              />
            </div>

            {/* Email */}
            <div className="space-y-3">
              <Label htmlFor="email" className="text-sm font-medium">
                Correo electronico <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="juan@empresa.cl"
                className="h-11"
              />
            </div>

            {/* Password */}
            <div className="space-y-3">
              <Label htmlFor="password" className="text-sm font-medium">
                Contraseña {!editingUser && <span className="text-destructive">*</span>}
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                placeholder={editingUser ? 'Dejar vacio para no cambiar' : 'Minimo 8 caracteres'}
                className="h-11"
              />
              {editingUser && (
                <p className="text-xs text-muted-foreground">
                  Deje vacio si no desea cambiar la contraseña
                </p>
              )}
            </div>

            {/* Role */}
            <div className="space-y-3">
              <Label htmlFor="role" className="text-sm font-medium">Rol</Label>
              <Select
                value={formData.role}
                onValueChange={val => setFormData({ ...formData, role: val as UserRole })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(role => (
                    <SelectItem key={role} value={role} className="py-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn(getRoleColor(role))}>
                          {ROLE_LABELS[role]}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Activo */}
            <div className="flex items-center justify-between rounded-xl bg-muted/50 p-4">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Usuario activo</Label>
                <p className="text-xs text-muted-foreground">
                  Los usuarios inactivos no pueden iniciar sesion
                </p>
              </div>
              <Switch
                checked={formData.activo}
                onCheckedChange={val => setFormData({ ...formData, activo: val })}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-6 pb-4">
              <Button
                variant="outline"
                className="flex-1 h-11"
                onClick={() => setEditSheet(false)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 h-11"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Guardando...' : editingUser ? 'Actualizar' : 'Crear Usuario'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Usuario</DialogTitle>
            <DialogDescription>
              Esta seguro de eliminar al usuario &quot;{deleteDialog?.nombre}&quot;? Esta accion no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
