class PlanNode {
    constructor(id, content, conditions = {}, effects = {}, cost = 0) {
        if (typeof(cost)!=="number")
            throw("cost needs to be number");

        Object.assign(this, {id, content, conditions, effects, cost});
    }
}
class StateNode extends PlanNode {
    constructor(id, content) {
        super(id, content);
    }
}
class ActionNode extends PlanNode {
    constructor(id, content, pre, post, cost) {
        super(id, content, pre, post, cost);
    }
}
class TaskNode extends PlanNode {
    constructor(id, content) {
        super(id, content);
    }
}
class ParallelNode extends PlanNode {
    constructor(id) {
        super(id, {});
    }
}

class ConditionalNode extends PlanNode {
    constructor(id, content, effects, cost, conditionFunction) {
        super(id, content, {}, effects, cost);
        this.conditionFunction = conditionFunction;
    }

    evalCondition() {
        // Assuming conditionFunction now returns a promise
        return this.conditionFunction();
    }
}

class PlanEdge {
    constructor(sourceId, targetId, relation, conditions = {}, effects = {}, cost = 0) {
        Object.assign(this, {sourceId, targetId, relation, conditions, effects, cost});
    }
}

class PlanGraph {
    constructor() {
        this.nodes = new Map();
        this.edges = new Map();
    }

    addNode(node) {
        const id = node.id;

        const existing = this.getNode(id);
        if (existing) {
            if (existing === node) return; //identical instance
            throw ("node " + id + " already exist in graph");
        }

        this.nodes.set(id, node);
        this.edges.set(id, new Set());
    }

    getNode(id) {
        return this.nodes.get(id);
    }

    removeNode(id) {
        if (!this.nodes.delete(id)) return false;
        if (!this.edges.delete(id)) throw ("nodes and edges index inconsistency; in nodes, but not edges");

        for (const edges of this.edges.values()) {
            for (const e of edges) {
                if (e.sourceId === id || e.targetId === id)
                    edges.delete(e);
            }
        }
        return true;
    }

    addEdge(edge) {
        //TODO check for duplicates?
        const {sourceId, targetId} = edge;
        this.edges.get(sourceId)?.add(edge);
        this.edges.get(targetId)?.add(edge);
    }

    removeEdge(edge) {
        const {sourceId, targetId} = edge;
        this.edges.get(sourceId)?.delete(edge);
        this.edges.get(targetId)?.delete(edge);
    }

    addChildNode(parentId, childNode) {
        if (this.nodes.has(parentId)) {
            this.addNode(childNode);
            this.edges.get(parentId).add(childNode);
        }
    }

    getChildNodes(parentId) {
        return Array.from(this.edges.get(parentId) || []);
    }

    getEdgesByNodeArray(id, relType) {
        return [...this.getEdgesByNode(id, relType)];
    }

    * getEdgesByNode(id, relType = undefined) {
        const edges = this.edges.get(id);
        if (!edges)
            return;

        for (const edge of edges) {
            if ((!relType || edge.relation === relType) && (/*outgoing only*/edge.targetId!==id))
                yield edge;
        }
    }
}
class PlanningVisitor {
    constructor(graph) {
        this.graph = graph;
        this.plan = [];
        this.state = {};
    }

    visitNode(nodeId) {
        const node = this.graph.getNode(nodeId);
        if (!node)
            return false;

        if (node instanceof StateNode) {
            this.followTransitions(nodeId);
        } else if (node instanceof ActionNode || node instanceof ConditionalNode) {
            this.visitActionNode(node); // Handles actions and conditions
            this.followTransitions(nodeId); // Follow transitions after action/condition nodes
        } else if (node instanceof TaskNode) {
            this.visitTaskNode(node); // Handles decompositions
            // No direct transitions from TaskNode, as transitions are from actions/conditions
        } else if (node instanceof ParallelNode) {
            this.visitParallelNode(node); // Parallel processing
        } else {
            console.error("Unknown node type:", node);
        }
    }

// Adjust visitActionNode to only handle actions directly, not conditions.
    visitActionNode(node) {
        if (this.evaluateConditions(node.conditions)) {
            this.applyEffects(node.effects);
            this.plan.push({id: node.id});
            // Transitions handled after actions in visitNode
        }
    }

    visitParallelNode(node) {
        const childNodes = this.graph.getChildNodes(node.id);
        childNodes.map(c =>
            this.plan.push({id:c})
            //this.visitNode(c.id)
        );
    }

    visitTaskNode(node) {
        // const childNodes = this.graph.getChildNodes(node.id);
        // for (const child of childNodes)
        //     this.plan.push({id:child.targetId});//this.visitNode(child.id);

        const decompositions = this.graph.getEdgesByNodeArray(node.id, 'decomposition');
        for (const decomposition of decompositions) {
            //this.visitNode(decomposition.targetId);
            this.plan.push({id:decomposition.targetId});
        }
    }

    evaluateConditions(conditions) {
        return Object.entries(conditions).every(([key, value]) => this.state[key] === value);
    }

    applyEffects(effects) {
        Object.assign(this.state, effects);
    }

    generatePlan(startNodeId) {
        this.visitNode(startNodeId);
        return this.plan;
    }

    followTransitions(nodeId) {
        const transitions = this.graph.getEdgesByNodeArray(nodeId, 'transition');
        for (const transition of transitions) {
            if (this.evaluateConditions(transition.conditions)) {
                //this.visitNode(transition.targetId);
                this.plan.push({id:transition.targetId});
            }
        }
    }


}
class Planner {
    constructor(variablesState = {}) {
        this.graph = new PlanGraph();
        this.vars = variablesState;
    }

    addTask(id, content) {
        this.graph.addNode(new TaskNode(id, content));
    }

    addAction(id, content, pre, post, cost) {
        this.graph.addNode(new ActionNode(id, content, pre, post, cost));
    }

    addState(id, content) {
        this.graph.addNode(new StateNode(id, content));
    }

    addDecomposition(parentTaskId, childTaskId, cost = 0) {
        this.graph.addEdge(new PlanEdge(parentTaskId, childTaskId, 'decomposition', {}, {}, cost));
    }

    addTransition(fromId, toId, cost = 0) {
        this.graph.addEdge(new PlanEdge(fromId, toId, 'transition', {}, {}, cost));
    }
    plan(startID) {
        const visitor = new PlanningVisitor(this.graph);
        visitor.state = { ...this.variablesState };
        const plan = visitor.generatePlan(startID);
        this.variablesState = { ...visitor.state };
        return plan;
    }
    // * planGenerator(taskId, goalStateId, currentCost = 0, visited = new Set()) {
    //     if (typeof (taskId) !== "string")
    //         throw ("taskId must be string");
    //
    //     if (visited.has(taskId)) return; else visited.add(taskId);
    //
    //     const task = this.graph.getNode(taskId);
    //     if (!task) return;
    //
    //     if (!this.evalConds(task.conditions))
    //         return;
    //
    //     if (task instanceof ConditionalNode) {
    //         const conditionResult = task.evalCondition();
    //         if (conditionResult instanceof Promise)
    //             throw ("TODO Promise support");
    //
    //         //     // Directly yield the Promise to be handled by the async generator runner
    //         //     async function n() { return await conditionResult; }
    //         //     const resolvedCondition = yield n;
    //         //
    //         //     if (!resolvedCondition) return; // Exit the generator if the condition is false
    //         // } else {
    //         if (!conditionResult) return; // Exit the generator if the condition is false
    //         // }
    //     }
    //
    //     let elideTask = false;
    //
    //     const decompositions = this.edgesByCost(taskId, 'decomposition');
    //     if (decompositions.length > 0) {
    //
    //         const subPlan = [];
    //         for (const e of decompositions) {
    //             for (const x of this.planGenerator(e.targetId, goalStateId, currentCost + (e.cost || 0), new Set(visited)))
    //                 subPlan.push(x);
    //         }
    //
    //         if (subPlan.length > 0) {
    //             yield* subPlan;
    //             elideTask = true; //return;
    //         }
    //     }
    //
    //     const transitions = this.edgesByCost(taskId, 'transition');
    //     if (transitions.length > 0) {
    //         const subPlan = [...this.exploreTransitions(
    //             taskId, goalStateId, transitions,
    //             currentCost,
    //             visited
    //         )];
    //         if (subPlan.length > 0) {
    //             yield* subPlan;
    //             elideTask = true; // return;
    //         }
    //         // yield* this.exploreTransitions(taskId, goalStateId, transitions, currentCost, visited);
    //         // return;
    //     }
    //
    //     this.applyEffects(task.effects);
    //
    //     if (!elideTask && !(task instanceof ParallelNode)) {
    //         yield {id: taskId, type: task.constructor.name,
    //             cost: currentCost + (task.cost||0),
    //             effects: task.effects};
    //     }
    //
    //     if (task instanceof ParallelNode)
    //         yield* this.exploreParallel(taskId, goalStateId, currentCost, visited);
    // }
    //
    // * exploreTransitions(taskId, goalStateId, transitions, currentCost, visited) {
    //     for (const tran of transitions) {
    //         const targetID = tran.targetId;
    //         if (!visited.has(targetID) && this.evalConds(tran.conditions))
    //             yield* this.planGenerator(targetID, goalStateId,
    //                 currentCost + (tran.cost || 0), new Set(visited));
    //     }
    // }
    //
    // * exploreParallel(taskId, goalStateId, currentCost, visited) {
    //     for (const child of this.graph.getChildNodes(taskId))
    //         yield* this.planGenerator(child.id, goalStateId, currentCost, new Set(visited));
    // }

    edgesByCost(taskId, rel) {
        return this.edgesBy(taskId, rel).sort((a, b) => a.cost - b.cost);
    }

    edgesBy(taskId, rel) {
        return this.graph.getEdgesByNodeArray(taskId, rel);
    }




    async generateAndExecutePlan() {
        const plan = await planner.plan("Start");
        console.log("Generated Plan:", plan);
    }

    // async executeNode(node) {
    //     if (node instanceof ConditionalNode) {
    //         if (await node.evalCondition()) {
    //             this.applyEffects(node.effects);
    //         }
    //     } else if (node instanceof ParallelNode) {
    //         await Promise.all(this.graph.getChildNodes(node.id).map(childNode => this.executeNode(childNode)));
    //     } else {
    //         this.applyEffects(node.effects);
    //     }
    // }

}

function loginExample() {
    const p = new Planner({isLoggedIn: false});

    p.addTask('checkMessages', {name: 'Check Messages'});
    p.addState('loginPage', {description: 'Login Page'});
    p.addState('messagesPage', {description: 'Messages Page'});
    p.addAction('loginWithPassword', {name: 'Log In with Password'}, {isLoggedIn: false}, {isLoggedIn: true}, 10);
    p.addAction('loginWithFingerprint', {name: 'Log In with Fingerprint'}, {isLoggedIn: false}, {isLoggedIn: true}, 5);
    p.addAction('viewMessages', {name: 'View Messages'}, {isLoggedIn: true}, {}, 2);

    p.addDecomposition('checkMessages', 'loginWithPassword', 10);
    p.addDecomposition('checkMessages', 'loginWithFingerprint', 5);
    p.addDecomposition('checkMessages', 'viewMessages', 2);
    p.addTransition('loginPage', 'loginWithPassword', 10);
    p.addTransition('loginPage', 'loginWithFingerprint', 5);
    p.addTransition('loginWithPassword', 'viewMessages', 2);
    p.addTransition('loginWithFingerprint', 'viewMessages', 2);

    const plan = p.plan('checkMessages', 'viewMessages');
    console.log('Generated Plan:', plan);
}

function schoolDayExample() {
    const p = new Planner({atHome: true, hasBackpack: false, hasLunch: false, hasHomework: false});

    p.addTask('goToSchool', {name: 'Go to School'});
    p.addState('home', {description: 'At Home'});
    p.addState('school', {description: 'At School'});
    p.addAction('getReady', {name: 'Get Ready'}, {atHome: true}, {
        hasBackpack: true,
        hasLunch: true,
        hasHomework: true
    }, 10);
    p.addAction('travel', {name: 'Travel to School'}, {
        atHome: true,
        hasBackpack: true,
        hasLunch: true,
        hasHomework: true
    }, {atHome: false}, 20);
    p.addAction('attendClasses', {name: 'Attend Classes'}, {atHome: false}, {}, 30);

    p.addDecomposition('goToSchool', 'getReady', 10);
    p.addDecomposition('goToSchool', 'travel', 20);
    p.addDecomposition('goToSchool', 'attendClasses', 30);
    p.addTransition('home', 'getReady', 10);
    p.addTransition('getReady', 'travel', 20);
    p.addTransition('travel', 'attendClasses', 30);

    const plan = p.plan('goToSchool', 'attendClasses');
    console.log('Generated Plan:', plan);
}

function asyncDemo() {
    (async () => {

        const p = new Planner();
        p.graph.addNode(
            new ParallelNode('root'));
        p.graph.addChildNode('root',
            new ConditionalNode('cond1', {name: 'Check Something'}, {someEffect: true}, 5,
                () => Promise.resolve(true)));

        // const pp = await p.planAsync('root');
        // console.log(pp);
    })();
}


// loginExample();
// schoolDayExample();
// asyncDemo();

if (module) {
    module.exports = {
        PlanNode,
        PlanEdge,
        PlanGraph,
        ParallelNode,
        ConditionalNode,
        Planner,
    };
}
