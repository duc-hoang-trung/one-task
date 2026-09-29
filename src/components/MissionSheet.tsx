import { useState } from 'react'
import { useT } from '../i18n'
import { addMission, deleteMission, updateMission, type MissionInput } from '../lib/actions'
import { MISSION_SLOTS, type Mission, type MissionSlot } from '../lib/types'
import { SlotIcon } from './missionSlot'
import { Button, Field, Input, Modal, Muted, Segmented, Textarea } from './ui'

/** Thêm / sửa một nhiệm vụ hằng ngày: tên · buổi hoặc giờ cố định · khoảng thời lượng · các bước. */
export function MissionSheet({ mission, onClose }: { mission?: Mission; onClose: () => void }) {
  const { t } = useT()
  const [title, setTitle] = useState(mission?.title ?? '')
  const [slot, setSlot] = useState<MissionSlot>(mission?.slot ?? 'morning')
  const [at, setAt] = useState(mission?.at ?? '')
  const [from, setFrom] = useState(mission?.estimateMin ? String(mission.estimateMin) : '')
  const [to, setTo] = useState(mission?.estimateMaxMin ? String(mission.estimateMaxMin) : '')
  const [note, setNote] = useState(mission?.note ?? '')

  async function save() {
    if (!title.trim()) return
    const input: MissionInput = {
      // Có giờ cố định thì buổi suy ra từ giờ, khỏi phải khớp tay hai chỗ.
      slot: at ? undefined : slot,
      at: at || undefined,
      estimateMin: Number(from) > 0 ? Number(from) : undefined,
      estimateMaxMin: Number(to) > 0 ? Number(to) : undefined,
      note,
    }
    if (mission) await updateMission(mission.id, { ...input, title })
    else await addMission(title, input)
    onClose()
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="font-display mb-3 text-xl">{mission ? t('mission.edit') : t('mission.new')}</h2>
      <div className="flex flex-col gap-3">
        <Field label={t('form.title')}>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('mission.title.ph')} autoFocus />
        </Field>

        <Field label={t('mission.when')} hint={t('mission.when.hint')}>
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              value={slot} onChange={setSlot} size="sm"
              options={MISSION_SLOTS.map((s) => ({
                value: s,
                label: <span className="flex items-center gap-1"><SlotIcon slot={s} size={12} />{t(`mission.slot.${s}`)}</span>,
              }))}
            />
            <Input type="time" aria-label={t('mission.at')} className="!w-auto !py-1.5 text-sm" value={at} onChange={(e) => setAt(e.target.value)} />
            {at && <Button variant="ghost" size="sm" onClick={() => setAt('')}>{t('mission.at.clear')}</Button>}
          </div>
        </Field>

        <Field label={t('mission.howLong')} hint={t('mission.howLong.hint')}>
          <div className="flex items-center gap-2">
            <Input type="number" inputMode="numeric" min={1} aria-label={t('mission.from')} className="!w-24 text-center" placeholder={t('common.min')} value={from} onChange={(e) => setFrom(e.target.value)} />
            <span className="text-ink-3">–</span>
            <Input type="number" inputMode="numeric" min={1} aria-label={t('mission.to')} className="!w-24 text-center" placeholder={t('mission.to')} value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </Field>

        <Field label={t('mission.note')} hint={t('mission.note.hint')}>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('mission.note.ph')} />
        </Field>
      </div>

      <div className="mt-4 flex items-center gap-2">
        {mission && <Button variant="danger" size="sm" onClick={() => void deleteMission(mission.id).then(onClose)}>{t('row.delete')}</Button>}
        <span className="flex-1" />
        <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
        <Button onClick={() => void save()} disabled={!title.trim()}>{t('sheet.save')}</Button>
      </div>
      {!mission && <Muted className="mt-2 text-[12px]">{t('mission.new.hint')}</Muted>}
    </Modal>
  )
}
