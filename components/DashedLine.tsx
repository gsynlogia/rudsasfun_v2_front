export default function DashedLine() {
  return (
    <div className="mb-3 sm:mb-4 mt-4 sm:mt-6 w-full">
      <svg className="w-full h-2" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="1" x2="100%" y2="1" stroke="#d1d5db" strokeWidth="1" strokeDasharray="16 4" />
      </svg>
    </div>
  );
}