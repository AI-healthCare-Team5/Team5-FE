import { useId, useState } from "react";
import { NONE_TEXT, UNCHECKED_TEXT } from "@/api/values";
import { Button, Card } from "@/components/ui";
import type { SummaryContent } from "@/components/summary/types";
import {
  canSaveEdits,
  healthKeys,
  initialEdits,
  maxLengths,
  newHealthEntry,
  type HealthEntryEdit,
  type HealthKey,
  type SummaryEdits,
} from "@/pages/summary/editSummary";

const inputClass =
  "min-h-[max(44px,3.2rem)] w-full min-w-0 rounded-[16px] border border-control bg-surface px-4 py-3 placeholder:text-subtle";

const healthLabels: Record<HealthKey, string> = {
  medications: "복용 중인 약",
  conditions: "앓고 있는 병",
  allergies: "알레르기",
};

function Field({
  label,
  value,
  maxLength,
  required = false,
  onChange,
}: {
  label: string;
  value: string;
  maxLength: number;
  required?: boolean;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-bold">
        {label}
      </label>
      <input
        id={id}
        value={value}
        required={required}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
      />
    </div>
  );
}

// 복용약·앓는 병·알레르기는 서버에 종류별로 통째로 보내므로 목록 단위로 고칩니다.
function HealthField({
  label,
  original,
  entries,
  onChange,
}: {
  label: string;
  original: SummaryContent[HealthKey];
  entries: HealthEntryEdit[];
  onChange: (entries: HealthEntryEdit[]) => void;
}) {
  const update = (id: string, patch: Partial<HealthEntryEdit>) =>
    onChange(
      entries.map((entry) =>
        entry.id === id ? { ...entry, ...patch } : entry,
      ),
    );
  return (
    <fieldset className="flex min-w-0 flex-col gap-3">
      <legend className="mb-2 font-bold">{label}</legend>
      {entries.length === 0 && (
        <p className="text-muted">
          {original === null ? UNCHECKED_TEXT : NONE_TEXT}
        </p>
      )}
      {entries.map((entry, index) => (
        <div
          key={entry.id}
          className="flex flex-col gap-2 rounded-[16px] bg-notice p-3"
        >
          <input
            aria-label={`${label} ${index + 1} 이름`}
            placeholder="이름"
            value={entry.name}
            maxLength={maxLengths.other}
            onChange={(event) => update(entry.id, { name: event.target.value })}
            className={inputClass}
          />
          <input
            aria-label={`${label} ${index + 1} 설명`}
            placeholder="설명 (선택)"
            value={entry.detail}
            maxLength={maxLengths.other}
            onChange={(event) =>
              update(entry.id, { detail: event.target.value })
            }
            className={inputClass}
          />
          <Button
            variant="quiet"
            aria-label={`${label} ${index + 1} 지우기`}
            onClick={() =>
              onChange(entries.filter((item) => item.id !== entry.id))
            }
          >
            지우기
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        aria-label={`${label} 추가`}
        onClick={() => onChange([...entries, newHealthEntry()])}
      >
        + 추가
      </Button>
    </fieldset>
  );
}

// 안내된 진료과는 고칠 수 없어서 읽기만 합니다.
export function SummaryEditForm({
  summary,
  onSave,
  onCancel,
}: {
  summary: SummaryContent;
  onSave: (edits: SummaryEdits) => void;
  onCancel: () => void;
}) {
  const [edits, setEdits] = useState(() => initialEdits(summary));
  return (
    <Card className="flex flex-col gap-5">
      <Field
        label="주된 증상"
        value={edits.mainSymptom}
        maxLength={maxLengths.mainSymptom}
        required
        onChange={(mainSymptom) => setEdits({ ...edits, mainSymptom })}
      />
      <Field
        label="언제부터"
        value={edits.onsetDetail}
        maxLength={maxLengths.onsetDetail}
        onChange={(onsetDetail) => setEdits({ ...edits, onsetDetail })}
      />
      {summary.items.map((item) => (
        <Field
          key={item.order}
          label={item.label}
          value={edits.itemValues[item.order] ?? ""}
          maxLength={maxLengths.other}
          onChange={(value) =>
            setEdits({
              ...edits,
              itemValues: { ...edits.itemValues, [item.order]: value },
            })
          }
        />
      ))}
      {healthKeys.map((key) => (
        <HealthField
          key={key}
          label={healthLabels[key]}
          original={summary[key]}
          entries={edits.health[key]}
          onChange={(entries) =>
            setEdits({ ...edits, health: { ...edits.health, [key]: entries } })
          }
        />
      ))}
      <dl>
        <dt className="mb-1 text-[0.889rem] font-medium text-subtle">
          안내된 진료과
        </dt>
        <dd className="font-bold text-brand-strong">
          {summary.department?.departmentName ?? UNCHECKED_TEXT}
        </dd>
      </dl>
      <div className="flex flex-col gap-3">
        <Button disabled={!canSaveEdits(edits)} onClick={() => onSave(edits)}>
          저장하기
        </Button>
        <Button variant="outline" onClick={onCancel}>
          취소
        </Button>
      </div>
    </Card>
  );
}
