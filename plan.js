class PlanNode {
    constructor(id, type, content, conditions = {}, effects = {}, cost = 0) {
        Object.assign(this, { id, type, content, conditions, effects, cost });
    }
}

class PlanEdge {
    constructor(sourceId, targetId, relation, conditions = {}, effects = {}, cost = 0) {
        Object.assign(this, { sourceId, targetId, relation, conditions, effects, cost });
    }
}

class PlanGraph {
    constructor() {
        this.nodes = new Map();
        this.edges = [];
    }

    addNode(node) { this.nodes.set(node.id, node); }
    getNode(id) { return this.nodes.get(id); }
    addEdge(edge) { this.edges.push(edge); }
    getEdgesByNode(id, relationType = undefined) {
        return this.edges.filter(edge => (edge.sourceId === id || edge.targetId === id) && (!relationType || edge.relation === relationType));
    }
}

class Planner {
    constructor(variablesState = {}) {
        this.graph = new PlanGraph();
        this.variablesState = variablesState;
    }

    addTask(id, content) { this.graph.addNode(new PlanNode(id, 'task', content)); }
    addAction(id, content, pre, post, cost) { this.graph.addNode(new PlanNode(id, 'action', content, pre, post, cost)); }
    addState(id, content) { this.graph.addNode(new PlanNode(id, 'state', content)); }
    addDecomposition(parentTaskId, childTaskId, cost = 0) { this.graph.addEdge(new PlanEdge(parentTaskId, childTaskId, 'decomposition', {}, {}, cost)); }
    addTransition(fromId, toId, cost = 0) { this.graph.addEdge(new PlanEdge(fromId, toId, 'transition', {}, {}, cost)); }

    *planGenerator(taskId, goalStateId, currentCost, visited = new Set()) {
        if (visited.has(taskId)) return; else visited.add(taskId);

        const task = this.graph.getNode(taskId);
        if (task.type === 'action' && this.evalConds(task.conditions)) {
            const actionCost = currentCost + task.cost;
            this.applyEffects(task.effects);
            yield { name: task.content.name, cost: actionCost, effects: task.effects };
            if (taskId === goalStateId) return;
        } else if (task.type === 'task') {
            const decompositionEdges = this.graph.getEdgesByNode(taskId, 'decomposition').sort((a, b) => a.cost - b.cost);
            for (const edge of decompositionEdges) {
                const subPlan = [...this.planGenerator(edge.targetId, goalStateId, currentCost + edge.cost, new Set(visited))];
                if (subPlan.length > 0) {
                    yield* subPlan;
                    return;
                }
            }
        }

        const transitionEdges = this.graph.getEdgesByNode(taskId, 'transition').sort((a, b) => a.cost - b.cost);
        for (const edge of transitionEdges) {
            if (!visited.has(edge.targetId) && this.evalConds(edge.conditions)) {
                yield* this.planGenerator(edge.targetId, goalStateId, currentCost + edge.cost, visited);
            }
        }
    }

    plan(initialTaskId, goalStateId) {
        return [...this.planGenerator(initialTaskId, goalStateId, 0)];
    }

    evalConds(conds) { return Object.keys(conds).every(key => this.variablesState.hasOwnProperty(key) && this.variablesState[key] === conds[key]); }
    applyEffects(effects) { Object.assign(this.variablesState, effects); }
}

function loginExample() {
    const p = new Planner({ isLoggedIn: false });

    p.addTask('checkMessages', { name: 'Check Messages' });
    p.addState('loginPage', { description: 'Login Page' });
    p.addState('messagesPage', { description: 'Messages Page' });
    p.addAction('loginWithPassword', { name: 'Log In with Password' }, { isLoggedIn: false }, { isLoggedIn: true }, 10);
    p.addAction('loginWithFingerprint', { name: 'Log In with Fingerprint' }, { isLoggedIn: false }, { isLoggedIn: true }, 5);
    p.addAction('viewMessages', { name: 'View Messages' }, { isLoggedIn: true }, {}, 2);

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
    const p = new Planner({ atHome: true, hasBackpack: false, hasLunch: false, hasHomework: false });

    p.addTask('goToSchool', { name: 'Go to School' });
    p.addState('home', { description: 'At Home' });
    p.addState('school', { description: 'At School' });
    p.addAction('getReady', { name: 'Get Ready' }, { atHome: true }, { hasBackpack: true, hasLunch: true, hasHomework: true }, 10);
    p.addAction('travel', { name: 'Travel to School' }, { atHome: true, hasBackpack: true, hasLunch: true, hasHomework: true }, { atHome: false }, 20);
    p.addAction('attendClasses', { name: 'Attend Classes' }, { atHome: false }, {}, 30);

    p.addDecomposition('goToSchool', 'getReady', 10);
    p.addDecomposition('goToSchool', 'travel', 20);
    p.addDecomposition('goToSchool', 'attendClasses', 30);
    p.addTransition('home', 'getReady', 10);
    p.addTransition('getReady', 'travel', 20);
    p.addTransition('travel', 'attendClasses', 30);

    const plan = p.plan('goToSchool', 'attendClasses');
    console.log('Generated Plan:', plan);
}

loginExample();
schoolDayExample();
