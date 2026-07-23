export function initStormbreaker(model) {
  if (!model) return;

  const progress = model.querySelector(".model-loader span");
  let lastScroll = 0;

  model.addEventListener("progress", (event) => {
    const total = event.detail.totalProgress || 0;
    progress?.style.setProperty("--progress", `${Math.round(total * 100)}%`);
  });

  model.addEventListener("load", () => {
    model.classList.add("is-ready");
  });

  const updateFromScroll = () => {
    const hero = document.querySelector(".hero");
    if (!hero) return;
    const rect = hero.getBoundingClientRect();
    const progress = Math.min(1, Math.max(0, -rect.top / Math.max(rect.height, 1)));
    const theta = -26 + progress * 82;
    const phi = 78 + Math.sin(progress * Math.PI) * 12;
    const orbit = `${theta.toFixed(2)}deg ${phi.toFixed(2)}deg ${(105 + progress * 16).toFixed(1)}%`;
    model.setAttribute("camera-orbit", orbit);
    model.style.transform = `translate3d(0, ${progress * -3.2}rem, 0) scale(${1 - progress * 0.08})`;
    lastScroll = progress;
  };

  let raf = 0;
  window.addEventListener(
    "scroll",
    () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        updateFromScroll();
        raf = 0;
      });
    },
    { passive: true },
  );

  model.addEventListener("mouseleave", () => {
    const theta = -26 + lastScroll * 82;
    model.setAttribute("camera-orbit", `${theta}deg 78deg ${105 + lastScroll * 16}%`);
  });
}
