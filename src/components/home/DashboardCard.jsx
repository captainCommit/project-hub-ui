import React from 'react';
import { Link } from 'react-router-dom';

export const NAVY = '#102B5C';
export const TEXT = '#173766';
export const MUTED = '#6882A7';
export const ORANGE = '#FF6900';
export const BLUE = '#087BCB';
export const BORDER = '#E6EDF5';

export default function DashboardCard({ title, subtitle = undefined, viewAllTo = undefined, heightClass, children, tour = undefined }) {
  return (
    <section
      data-tour={tour}
      className={`bg-white rounded-[10px] border p-4 flex flex-col min-w-0 ${heightClass}`}
      style={{ borderColor: BORDER }}
    >
      <div className="flex items-start justify-between gap-3 flex-shrink-0">
        <div className="min-w-0">
          <h2 className="text-base font-bold truncate" style={{ color: NAVY }}>{title}</h2>
          {subtitle ? <p className="text-[10px] mt-0.5 truncate" style={{ color: MUTED }}>{subtitle}</p> : null}
        </div>
        {viewAllTo ? (
          <Link to={viewAllTo} className="text-xs font-medium hover:underline flex-shrink-0 whitespace-nowrap" style={{ color: ORANGE }}>
            View all →
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}