'use client';

export default function BackgroundDecorations() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Wavy lines - flight path style */}
      <svg
        className="absolute top-20 left-0 w-full opacity-20"
        viewBox="0 0 1200 200"
        preserveAspectRatio="none"
      >
        <path
          d="M0,100 Q300,50 600,100 T1200,100"
          stroke="#03adf0"
          strokeWidth="2"
          strokeDasharray="5,5"
          fill="none"
        />
        <path
          d="M0,120 Q250,80 500,120 T1000,120"
          stroke="#03adf0"
          strokeWidth="1.5"
          strokeDasharray="8,8"
          fill="none"
          opacity="0.6"
        />
      </svg>

      {/* Small clouds */}
      <div className="absolute top-32 right-10 w-24 h-16 opacity-15">
        <svg viewBox="0 0 100 60" fill="none">
          <ellipse cx="30" cy="30" rx="25" ry="20" fill="#03adf0" />
          <ellipse cx="50" cy="25" rx="30" ry="25" fill="#03adf0" />
          <ellipse cx="70" cy="30" rx="25" ry="20" fill="#03adf0" />
        </svg>
      </div>

      <div className="absolute top-64 left-20 w-20 h-12 opacity-10">
        <svg viewBox="0 0 80 50" fill="none">
          <ellipse cx="25" cy="25" rx="20" ry="15" fill="#03adf0" />
          <ellipse cx="40" cy="20" rx="25" ry="20" fill="#03adf0" />
          <ellipse cx="55" cy="25" rx="20" ry="15" fill="#03adf0" />
        </svg>
      </div>

      <div className="absolute bottom-40 right-32 w-28 h-18 opacity-12">
        <svg viewBox="0 0 110 70" fill="none">
          <ellipse cx="30" cy="35" rx="28" ry="22" fill="#03adf0" />
          <ellipse cx="55" cy="30" rx="35" ry="28" fill="#03adf0" />
          <ellipse cx="80" cy="35" rx="28" ry="22" fill="#03adf0" />
        </svg>
      </div>

      {/* Decorative dotted elements */}
      <div className="absolute top-96 left-1/4 opacity-10">
        <svg width="60" height="60" viewBox="0 0 60 60">
          <circle cx="10" cy="10" r="2" fill="#03adf0" />
          <circle cx="30" cy="15" r="1.5" fill="#03adf0" />
          <circle cx="50" cy="10" r="2" fill="#03adf0" />
          <circle cx="15" cy="30" r="1.5" fill="#03adf0" />
          <circle cx="45" cy="35" r="2" fill="#03adf0" />
          <circle cx="20" cy="50" r="1.5" fill="#03adf0" />
          <circle cx="40" cy="50" r="2" fill="#03adf0" />
        </svg>
      </div>
    </div>
  );
}

