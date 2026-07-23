export function initRevealMotion() {
  const items = [...document.querySelectorAll(".reveal")];
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0.08 },
  );
  items.forEach((item) => observer.observe(item));
}

export function initParallax() {
  const items = [...document.querySelectorAll("[data-parallax]")];
  if (!items.length || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  let ticking = false;
  const render = () => {
    const viewport = window.innerHeight;
    items.forEach((item) => {
      const rect = item.getBoundingClientRect();
      const speed = Number(item.dataset.parallax || 0);
      const offset = (rect.top + rect.height * 0.5 - viewport * 0.5) * speed;
      item.style.translate = `0 ${offset.toFixed(2)}px`;
    });
    ticking = false;
  };

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(render);
      }
    },
    { passive: true },
  );
  render();
}

export function initRealmTracking(onRealmChange) {
  const realms = [...document.querySelectorAll("[data-realm]")];
  const index = document.querySelector("#scroll-index");
  const progress = document.querySelector("#scroll-progress");
  const navLinks = [...document.querySelectorAll(".site-nav a")];
  let activeRealm = "";
  let lastY = window.scrollY;

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;

      const next = visible.target.dataset.realm;
      if (next !== activeRealm) {
        activeRealm = next;
        if (index) index.textContent = next;
        onRealmChange?.(Number(next), visible.target);
      }

      navLinks.forEach((link) => {
        const target = document.querySelector(link.getAttribute("href"));
        link.classList.toggle("is-active", target === visible.target);
      });
    },
    { threshold: [0.16, 0.3, 0.52] },
  );
  realms.forEach((realm) => observer.observe(realm));

  const header = document.querySelector(".site-header");
  let frame = 0;
  window.addEventListener(
    "scroll",
    () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const ratio = max > 0 ? window.scrollY / max : 0;
        progress?.style.setProperty("transform", `scaleY(${ratio})`);

        const delta = window.scrollY - lastY;
        if (window.scrollY > 180 && delta > 8) header?.classList.add("is-hidden");
        if (delta < -8) header?.classList.remove("is-hidden");
        lastY = window.scrollY;
        frame = 0;
      });
    },
    { passive: true },
  );
}

export function initPointerAtmosphere() {
  if (matchMedia("(pointer: coarse)").matches) return;

  window.addEventListener("pointermove", (event) => {
    const x = event.clientX / window.innerWidth - 0.5;
    const y = event.clientY / window.innerHeight - 0.5;
    document.documentElement.style.setProperty("--pointer-x", x.toFixed(3));
    document.documentElement.style.setProperty("--pointer-y", y.toFixed(3));
    document.querySelector(".hero__aurora")?.style.setProperty(
      "translate",
      `${(x * 1.2).toFixed(2)}rem ${(y * 1.2).toFixed(2)}rem`,
    );
  });
}
