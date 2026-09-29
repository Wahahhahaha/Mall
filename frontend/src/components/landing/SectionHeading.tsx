import Reveal from '../Reveal';

interface SectionHeadingProps {
  title: string;
  sub?: string;
  align?: 'left' | 'center';
  action?: React.ReactNode;
}

export default function SectionHeading({ title, sub, align = 'left', action }: SectionHeadingProps) {
  return (
    <Reveal stagger>
      <div className={`section-heading ${align === 'center' ? 'center' : ''}`}>
        <div className="section-heading-copy">
          <h1 className="landing-section-title">{title}</h1>
          {sub && <p className="landing-section-sub">{sub}</p>}
        </div>
        {action && <div className="section-heading-action">{action}</div>}
      </div>
    </Reveal>
  );
}
