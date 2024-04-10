class PlanNode {
    constructor({ pre = () => true, exec, cost = 0, startTime = null, duration = null }) {
        Object.assign(this, { pre, exec, cost, startTime, duration });
    }

    async run(vars) {
        if (!this.pre(vars)) return false;
        // TODO: Implement timing logic for startTime and duration
        return await this.exec(vars);
    }
}

class AbstractExec {
    order(nodes, vars) {
        return nodes; // Placeholder: return nodes as-is
    }
}
class DepthFirstExec extends AbstractExec { /* DFS Logic */ }
class BreadthFirstExec extends AbstractExec { /* BFS Logic */ }
class LowestCostExec extends AbstractExec {  /* choose lowest cost from the options */ }
//TODO Stochastic Sample, BEAM, etc?

class Planner {
    constructor() {
        this.nodes = new Map();
        this.dependencyMap = {}; // Maps vars properties to nodes that depend on them
        this.executor = new DepthFirstExec();
        this.vars = new Proxy({}, {
            set: (target, property, value) => {
                target[property] = value;
                this.notify(property); // Trigger re-evaluation when vars change
                return true;
            }
        });
    }

    // Proxy handler to monitor changes in vars
    setExecutor(e) {
        this.executor = e;
    }

    // Notify nodes that depend on the changed property
    notify(changedProperty) {
        const x = this.dependencyMap[changedProperty];
        if (x)
            x.forEach(nodeId => this.reEvaluate(nodeId));
    }

    // Re-evaluate conditions for a given node
    async reEvaluate(nodeId) {
        const node = this.nodes.get(nodeId);
        if (node && node.pre(this.vars))
            await node.run(this.vars);
    }

    node(id, { pre = () => true, exec, cost = 0, dependsOn = [] }) {
        const node = new PlanNode({ pre, exec, cost });
        this.nodes.set(id, node);
        dependsOn.forEach(property => {
            let x = this.dependencyMap[property];
            if (!x)
                x = this.dependencyMap[property] = [];
            x.push(id);
        });
        return this;
    }
    serial(id, nodeIds, cost = 0) {
        return this.node(id, {
            exec: async () => {
                for (const nid of nodeIds) await this.run(nid);
            }, cost
        });
    }

    parallel(id, nodeIds, cost = 0) {
        return this.node(id, {
            exec: async () => {
                await Promise.all(nodeIds.map(nid => this.run(nid)));
            }, cost
        });
    }

    async run(nodeId) {
        const n = this.nodes.get(nodeId);
        if (!n) throw new Error(`Node ${nodeId} not found.`);
        // TODO: Check and apply dynamic dependencies before node execution
        // TODO: Reevaluate and adjust execution based on state changes
        return n.run(this.vars);
    }
    // // Adjusted run method to accommodate new execution strategy handling
    // async run() {
    //     const orderedNodes = this.executor.order(this.nodes, this.vars);
    //     for (let node of orderedNodes)
    //         await node.run(this.vars);
    // }
}

class TracingPlanner {
    constructor(planner) {
        return new Proxy(planner, {
            get(target, prop) {
                return (...args) => {
                    console.debug('trace', prop, args);
                    const y = Reflect.apply(target[prop], target, args);
                    if (prop === 'run') y.then(() => console.log(`run end: ${args[0]}`));
                    return y;
                };
            }
        });
    }
}

// TODO: Implement a conditional node execution pattern
// TODO: Add error handling and logging for node execution failures
// TODO: Expand the system to include dynamic node dependencies and reevaluation of preconditions
// TODO: Implement a way to visualize or debug the execution flow of nodes
// TODO: Optimize parallel node execution for performance

if (module) {
    module.exports = {
        Planner, TracingPlanner,
        PlanNode,
        AbstractExec, DepthFirstExec, BreadthFirstExec, LowestCostExec
    };
}
