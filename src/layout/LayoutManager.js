import { gsap } from 'gsap';

export class LayoutManager {
    constructor(space, pluginManager) {
        this.space = space;
        this.pluginManager = pluginManager;
        this.layouts = new Map();
        this.activeLayout = null;
        this.activeLayoutName = null;
    }

    registerLayout(name, layoutInstance) {
        if (this.layouts.has(name)) console.warn(`LayoutManager: Layout "${name}" is already registered. Overwriting.`);
        layoutInstance.setContext?.(this.space, this.pluginManager);
        this.layouts.set(name, layoutInstance);
    }

    async applyLayout(name, config = {}) {
        const newLayout = this.layouts.get(name);
        if (!newLayout) {
            console.error(`LayoutManager: Layout "${name}" not found.`);
            return false;
        }

        if (this.activeLayout) {
            this.activeLayout.stop?.();
            this.space.emit('layout:stopped', { name: this.activeLayoutName, layout: this.activeLayout });
        }

        this.activeLayout = newLayout;
        this.activeLayoutName = name;

        this.activeLayout.updateConfig?.(config);

        const { NodePlugin, EdgePlugin } = this.pluginManager.getAllPlugins().reduce((acc, p) => ({ ...acc, [p.getName()]: p }), {});

        const nodes = NodePlugin ? [...NodePlugin.getNodes().values()] : [];
        const edges = EdgePlugin ? [...EdgePlugin.getEdges().values()] : [];

        if (this.activeLayout.init) {
            const oldPositions = new Map();
            nodes.forEach((node) => oldPositions.set(node.id, node.position.clone()));

            await this.activeLayout.init(nodes, edges, config);

            const animationPromises = [];
            nodes.forEach((node) => {
                const currentPos = oldPositions.get(node.id);
                const targetPos = node.position;

                const tempOldPos = currentPos.clone();
                node.position.copy(tempOldPos);

                animationPromises.push(new Promise((resolve) => {
                    gsap.to(node.position, {
                        x: targetPos.x,
                        y: targetPos.y,
                        z: targetPos.z,
                        duration: 0.7,
                        ease: 'power2.inOut',
                        onComplete: resolve,
                    });
                }));
            });

            await Promise.all(animationPromises);
        }

        if (this.activeLayout.run) {
            this.space.emit('layout:started', { name: this.activeLayoutName, layout: this.activeLayout });
            await this.activeLayout.run();
        }
        return true;
    }

    stopLayout() {
        if (this.activeLayout) {
            this.activeLayout.stop?.();
            this.space.emit('layout:stopped', { name: this.activeLayoutName, layout: this.activeLayout });
        }
    }

    update() {
        this.activeLayout?.update?.();
    }

    addNodeToLayout(node) {
        this.activeLayout?.addNode?.(node);
    }

    removeNodeFromLayout(node) {
        this.activeLayout?.removeNode?.(node);
    }

    addEdgeToLayout(edge) {
        this.activeLayout?.addEdge?.(edge);
    }

    removeEdgeFromLayout(edge) {
        this.activeLayout?.removeEdge?.(edge);
    }

    kick() {
        this.activeLayout?.kick?.();
    }

    getActiveLayout() {
        return this.activeLayout;
    }

    getActiveLayoutName() {
        return this.activeLayoutName;
    }

    dispose() {
        this.stopLayout();
        this.layouts.forEach((layout) => layout.dispose?.());
        this.layouts.clear();
        this.activeLayout = null;
        this.activeLayoutName = null;
        this.space = null;
        this.pluginManager = null;
    }
}
