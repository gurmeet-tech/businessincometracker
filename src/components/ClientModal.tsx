import { useEffect, useState } from 'react'
import type { Client, ClientInput, ClientStatus } from '../types'
import { useData } from '../context/DataContext'
import { useAsyncAction } from '../hooks/useAsyncAction'
import { Button, Field, Modal, Segmented } from './ui'

const CLIENT_STATUSES: ClientStatus[] = ['Active', 'Lead', 'Inactive', 'Archived']

export function ClientModal({
  open,
  client,
  onClose,
}: {
  open: boolean
  client: Client | null
  onClose: () => void
}) {
  const { createClient, updateClient } = useData()
  const { run, busy } = useAsyncAction()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState<ClientStatus>('Active')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName(client?.name ?? '')
    setEmail(client?.email ?? '')
    setCompany(client?.company ?? '')
    setPhone(client?.phone ?? '')
    setStatus(client?.status ?? 'Active')
    setNotes(client?.notes ?? '')
    setError(null)
  }, [open, client])

  const save = async () => {
    if (!name.trim()) {
      setError('Client name is required.')
      return
    }
    const input: ClientInput = {
      name: name.trim(),
      email: email.trim(),
      company: company.trim(),
      phone: phone.trim(),
      status,
      notes: notes.trim(),
    }
    const succeeded = await run(
      () => (client ? updateClient(client.id, input) : createClient(input)),
      {
        success: client ? 'Client updated.' : 'Client added.',
        onError: setError,
      },
    )
    if (succeeded) onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={client ? 'Edit client' : 'New client'}
      subtitle={client ? 'Update relationship details and status.' : 'Add a client to link transactions and track revenue.'}
      width={520}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void save()} loading={busy}>
            {client ? 'Save client' : 'Add client'}
          </Button>
        </>
      }
    >
      <div className="form-grid">
        {error && <div className="form-alert">{error}</div>}
        <Field label="Client name" required>
          <input
            className="text-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Ava Chen"
            autoFocus
          />
        </Field>
        <div className="form-grid-2">
          <Field label="Company">
            <input
              className="text-input"
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              placeholder="Northwind Studio"
            />
          </Field>
          <Field label="Email">
            <input
              className="text-input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="hello@company.com"
            />
          </Field>
        </div>
        <div className="form-grid-2">
          <Field label="Phone">
            <input
              className="text-input"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+1 (555) 000-0000"
            />
          </Field>
          <Field label="Status">
            <Segmented
              value={status}
              onChange={setStatus}
              size="sm"
              options={CLIENT_STATUSES.map((item) => ({ value: item, label: item }))}
            />
          </Field>
        </div>
        <Field label="Notes">
          <textarea
            className="text-area"
            rows={4}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Billing terms, relationship context, follow-ups…"
          />
        </Field>
      </div>
    </Modal>
  )
}
