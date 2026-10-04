(() => {
  'use strict';
  const hero = document.querySelector('.personal-hero');
  const person = document.querySelector('.hero-person');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  let frame = 0;
  function update() {
    frame = 0;
    const off = reduced.matches || document.body.classList.contains('motion-paused') || !fine.matches;
    const amount = off ? 0 : Math.min(1, Math.max(0, -hero.getBoundingClientRect().top / hero.offsetHeight));
    person.style.setProperty('--portrait-shift', `${amount * 65}px`);
    person.style.setProperty('--portrait-y', `${amount * -8}deg`);
  }
  function queue() { if (!frame) frame = requestAnimationFrame(update); }
  addEventListener('scroll', queue, {passive:true});
  reduced.addEventListener('change', queue);
  document.querySelector('.motion-toggle').addEventListener('click', queue);
  const descriptions = {
    autocode: ['AutoCodeGPT', 'Reasoning, Docker execution, and a feedback loop.'],
    autoblog: ['AutoBlogGPT', 'Retrieval, generation, and evaluation coordinated with LangGraph.'],
    snp: ['SnP Image Labeler', 'Structured annotation and ground truth for production ML evaluation.']
  };
  document.querySelectorAll('[data-evidence]').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-evidence]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
      document.querySelectorAll('.evidence-selected').forEach(card => card.classList.remove('evidence-selected'));
      const id = button.dataset.evidence;
      document.getElementById(id).classList.add('evidence-selected');
      const [title, description] = descriptions[id];
      const link = document.createElement('a');
      link.href = '#' + id;
      link.textContent = `Explore ${title} ↑`;
      document.querySelector('.skill-result').replaceChildren(description + ' ', link);
    });
  });
})();
