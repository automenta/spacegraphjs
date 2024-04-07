class PlanNode {
    constructor(pre = () => true, exec, cost = 0) {
        Object.assign(this, { pre, exec, cost });
    }

    async run(vars) {
        if (!this.pre(vars)) return false;
        return await this.exec(vars);
    }
}

class Planner {
    constructor() {
        this.nodes = new Map();
        this.vars = {};
    }

    node(id, { pre = () => true, exec, cost = 0 }) {
        this.nodes.set(id, new PlanNode(pre, exec, cost));
        return this;
    }

    serial(id, nodeIds, cost = 0) {
        return this.node(id, {
            exec: async (vars) => {
                for (const nodeId of nodeIds) await this.run(nodeId);
            }, cost
        });
    }

    parallel(id, nodeIds, cost = 0) {
        return this.node(id, {
            exec: async (vars) => {
                await Promise.all(nodeIds.map(nid => this.run(nid)));
            }, cost
        });
    }

    async run(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) throw(`Node ${nodeId} not found.`);
        return node.run(this.vars);
    }
}

class TracingPlanner {
    constructor(planner) {
        return new Proxy(planner, {
            get(target, prop) {
                return (...args) => {
                    console.debug('trace', prop, args);
                    const result = Reflect.apply(target[prop], target, args);
                    if (prop === 'run') result.then(() => console.log(`run end: ${args[0]}`));
                    return result;
                };
            }
        });
    }
}


// TODO: Implement a conditional node execution pattern
// TODO: Add error handling and logging for node execution failures
// TODO: Optimize parallel node execution for performance
// TODO: Expand the system to include dynamic node dependencies and reevaluation of preconditions
// TODO: Implement a way to visualize or debug the execution flow of nodes

if (module) { module.exports = { Planner, PlanNode, TracingPlanner }; }
