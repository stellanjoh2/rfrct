import { faqItems } from "../content/faq";

export function FaqSection() {
  return (
    <section id="faq" className="blod-section blod-section--faq">
      <div className="blod-section-inner blod-section-inner--prose">
        <h2>FAQ</h2>
        <ul className="blod-faq-list">
          {faqItems.map((item) => (
            <li key={item.question} className="blod-faq-list__item">
              <details className="blod-faq-item">
                <summary className="blod-faq__question">{item.question}</summary>
                <div className="blod-faq__answer-clip">
                  <div className="blod-faq__answer">{item.content}</div>
                </div>
              </details>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
