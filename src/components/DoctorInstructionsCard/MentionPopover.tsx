/**
 * MentionPopover.jsx — the card shown when a mention chip is clicked.
 * Reads the SNAPSHOT stored in the chip, so it shows what was true when the
 * note was written. Two layouts: patient and doctor.
 */
import { getInitials, ageYears, prettyDate, statusBadgeClass } from './utils';
import type {
  MentionSnapshot,
  PatientSnapshot,
  DoctorSnapshot,
} from '../../types';

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Active',
  CRITICAL: 'Critical',
  ADMITTED: 'Admitted',
  FOLLOW_UP: 'Follow-up',
  DISCHARGED: 'Discharged',
};

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="np-popover__row">
      <span className="np-popover__label">{label}</span>
      <span className="np-popover__value">{value || '—'}</span>
    </div>
  );
}

function PillBlock({
  label,
  items,
  variant,
}: {
  label: string;
  items?: string[];
  variant: string;
}) {
  if (!items || items.length === 0) return null;
  return (
    <div className="np-popover__block">
      <div className="np-popover__block-label">{label}</div>
      <div className="np-popover__pills">
        {items.map((it: string, i: number) => (
          <span key={i} className={`np-pill np-pill--${variant}`}>
            {it}
          </span>
        ))}
      </div>
    </div>
  );
}

function PatientPopover({ data }: { data: PatientSnapshot }) {
  return (
    <>
      <div className="np-popover__head">
        <span className="np-popover__avatar np-popover__avatar--patient">
          {getInitials(data.name)}
        </span>
        <div>
          <div className="np-popover__name">{data.name}</div>
          <div className="np-popover__sub">{data.mrn}</div>
        </div>
      </div>
      <div className="np-popover__badges">
        <span className={`np-badge ${statusBadgeClass(data.status)}`}>
          {STATUS_LABEL[data.status as string] || data.status}
        </span>
      </div>

      <div className="np-popover__divider" />

      <Row label="Age" value={`${ageYears(data.age)} yrs`} />
      <Row label="Gender" value={data.gender} />
      <Row label="Blood group" value={data.bloodGroup} />
      <Row label="Primary doctor" value={data.primaryPhysician} />

      <PillBlock
        label="Chronic conditions"
        items={data.chronicConditions}
        variant="condition"
      />
      <PillBlock label="Allergies" items={data.allergies} variant="allergy" />

      <div className="np-popover__divider" />
      <Row label="Last visit" value={prettyDate(data.lastVisit)} />
      <Row label="Next appointment" value={prettyDate(data.nextAppointment)} />

      {data.currentMedications && data.currentMedications.length > 0 && (
        <div className="np-popover__block">
          <div className="np-popover__block-label">Current medications</div>
          <ul className="np-popover__meds-list np-popover__meds">
            {data.currentMedications.map((m: string, i: number) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      <button type="button" className="np-popover__link">
        Open full record →
      </button>
    </>
  );
}

function DoctorPopover({ data }: { data: DoctorSnapshot }) {
  return (
    <>
      <div className="np-popover__head">
        <span className="np-popover__avatar np-popover__avatar--doctor">
          {getInitials(data.name)}
        </span>
        <div>
          <div className="np-popover__name">{data.name}</div>
          <div className="np-popover__sub">{data.specialization}</div>
        </div>
      </div>
      <div className="np-popover__badges">
        {data.isAvailableNow ? (
          <span className="np-badge np-badge--available">
            <span className="np-badge__dot" />
            Available now
          </span>
        ) : (
          <span className="np-badge np-badge--busy">Unavailable</span>
        )}
      </div>

      <div className="np-popover__divider" />

      <Row label="Department" value={data.department} />
      <Row label="Room" value={data.room} />
      <Row label="Hours" value={data.availableHours} />
      <Row label="Phone" value={data.phone} />

      <PillBlock
        label="Qualifications"
        items={data.qualifications}
        variant="qual"
      />

      <button type="button" className="np-popover__link">
        View schedule →
      </button>
    </>
  );
}

export default function MentionPopover({ data }: { data: MentionSnapshot }) {
  if (!data) return null;
  return (
    <div className="np-popover" onMouseDown={(e) => e.stopPropagation()}>
      {data.type === 'doctor' ? (
        <DoctorPopover data={data} />
      ) : (
        <PatientPopover data={data} />
      )}
    </div>
  );
}
