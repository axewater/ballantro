/* Star-tunnel canvas animation – lightweight & no dependencies */
(() => {
    const canvas = document.getElementById("starfield");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let w, h, cx, cy, stars = [];
    const STAR_COUNT = 750;
    const SPEED = 0.0025; // tweak for effect
    const Z_MAX = 8;

    const resize = () => {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;
        cx = w / 2;
        cy = h / 2;
    };
    window.addEventListener("resize", resize);
    resize();

    const resetStar = (s) => {
        s.x = (Math.random() - 0.5) * w;
        s.y = (Math.random() - 0.5) * h;
        s.z = Math.random() * Z_MAX + 0.1;
    };

    // init stars
    stars = Array.from({ length: STAR_COUNT }, () => {
        const s = {};
        resetStar(s);
        return s;
    });

    const step = () => {
        ctx.fillStyle = "rgba(0,0,0,0.75)";
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = "#ffffff";
        stars.forEach((s) => {
            s.z -= SPEED;
            if (s.z <= 0) resetStar(s);

            const k = 600 / s.z; // simple perspective
            const sx = cx + s.x * k / w;
            const sy = cy + s.y * k / h;

            if (sx < 0 || sx >= w || sy < 0 || sy >= h) {
                resetStar(s);
                return;
            }

            // Radius calc – can become slightly negative because s.z may start just
            // above Z_MAX due to the random reset.  Instead of clamping to 0 (which
            // can still result in a tiny negative because of float precision) we
            // skip drawing stars that would be too small or invalid.
            let size = (1 - s.z / Z_MAX) * 3;
            if (size <= 0) {
                // Star is “behind” viewer – recycle it on next frame
                return;
            }

            ctx.beginPath();
            ctx.arc(sx, sy, size, 0, Math.PI * 2);
            ctx.fill();
        });

        requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
})();
