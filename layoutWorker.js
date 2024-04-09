// layoutWorker.js
// Further optimized force-directed layout with minimized repetitive calculations.

onmessage = e => {
    const { action, nodes, edges, layoutModel } = e.data;
    if (action === 'updateLayout') {
        const layout = layouts[layoutModel] || layouts.forceDirected;
        postMessage({ positions: layout(nodes, edges) });
    }
};

const layouts = {
    forceDirected: (nodes, edges) => {
        const fC = 50, sL = 100, a = 1 / fC, maxIt = 1;

        const distMax = 300; //TODO tune based on node sizes
        const distMaxSq = distMax*distMax;

        const pos = new Map(), //positions
              rF = new Map(); //repulsion forces

        nodes.map(e => pos.set(e[0], [ e[1], e[2] ]));

        function enforce(id, mX, mY) {
            const f = rF.get(id) || [0, 0];
            f[0] += mX; f[1] += mY;
            rF.set(id, f);
        }

        for (let i = 0; i < maxIt; i++) {
            pos.forEach((a, A) => pos.forEach((b, B) => {

                //TODO iterate only the upper triangle of the matrix

                if (A === B) return;

                let
                    dx = a[0] - b[0],
                    dy = a[1] - b[1],
                    distSq = dx * dx + dy * dy;
                if (distSq > distMaxSq)
                    return;
                if (distSq < 1.0E-5) {
                    //HACK when they are at the same position
                    dx = (Math.random() * 2) - 1;
                    dy = (Math.random() * 2) - 1;
                    distSq = dx * dx + dy * dy;
                }
                const force = fC / distSq;
                const forceXY = rF.get(A) || [0, 0];
                const z = [forceXY[0] + dx * force, forceXY[1] + dy * force];
                rF.set(A, z);
            }));


            //ATTRACT
            edges.forEach(e => {
                const src = e[1], tgt = e[2];
                const sP = pos.get(src), tP = pos.get(tgt),
                    dx = tP[0] - sP[0],
                    dy = tP[1] - sP[1],
                    dist = Math.sqrt(dx * dx + dy * dy) || sL,
                    force = (dist - sL) * a,
                    forceDivDist = force / dist,
                    mX = dx * forceDivDist,
                    mY = dy * forceDivDist;

                enforce(src, +mX, +mY);
                enforce(tgt, -mX, -mY);
            });

            //apply accumulated forces in separate phase
            pos.forEach((p, id) => {
                const rf = rF.get(id);
                if (rf) {
                    //console.log(rf);
                    pos.set(id, [p[0] + rf[0], p[1] + rf[1]]);
                }
            });

            rF.clear();

        }

        return Array.from(pos,v => [v[0], v[1][0], v[1][1]]);
    }
};
