import { useState } from 'react';
import { Plus } from 'lucide-react';
import Reveal from '../Reveal';

export interface FaqItem {
  q: string;
  a: string;
}

interface FaqSectionProps {
  faqs: FaqItem[];
  title?: string;
}

function FaqItemRow({ item, open, onToggle }: { item: FaqItem; open: boolean; onToggle: () => void }) {
  return (
    <div className={`faq-item ${open ? 'open' : ''}`}>
      <button
        type="button"
        className="faq-question"
        aria-expanded={open}
        onClick={onToggle}
      >
        <span>{item.q}</span>
        <Plus size={17} className="faq-icon" />
      </button>
      {open && <p className="faq-answer">{item.a}</p>}
    </div>
  );
}

export default function FaqSection({ faqs, title }: FaqSectionProps) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <>
      {title && <Reveal><h2 className="landing-section-title faq-section-title">{title}</h2></Reveal>}
      <Reveal stagger className="faq-list">
        {faqs.map((item, i) => (
          <FaqItemRow
            key={item.q}
            item={item}
            open={openIdx === i}
            onToggle={() => setOpenIdx(openIdx === i ? null : i)}
          />
        ))}
      </Reveal>
    </>
  );
}
