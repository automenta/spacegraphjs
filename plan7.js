class EnhancedSet extends Set {
    add(item) { super.add(item); return this; }
}

class Predicate extends Array {
    toString() { return `(${this.join(',')})`; }
}

class Action {
    constructor(name, params, preconditions = [], effects = [], cost = 1) {
        Object.assign(this, { name, params, preconditions, effects, cost });
    }
    toString() { return `${this.name}(${this.params.join(',')})`; }
}

class PlanningDomain {
    constructor() {
        this.actions = new Map();
    }
    addAction(action) { this.actions.set(action.name, action); return this; }
}

class State {
    constructor(init = {}) {
        this.vars = new Proxy(init, {
            set: (target, property, value) => (target[property] = value, true)
        });
    }
    applyEffect(effect) {
        Object.entries(effect).forEach(([key, value]) => this.vars[key] = value);
    }
}

class PlanningProblem {
    constructor(domain, init = {}, goal = {}) {
        this.domain = domain;
        this.initState = new State(init);
        this.goal = goal;
        this.actions = [];
    }
    addAction(name, ...params) {
        const action = this.domain.actions.get(name);
        if (action && action.preconditions.every(pre => pre(this.initState.vars))) {
            this.actions.push({ action, params });
            action.effects.forEach(effect => this.initState.applyEffect(effect));
        }
        return this;
    }
    goalAchieved() {
        return Object.keys(this.goal).every(key => this.initState.vars[key] === this.goal[key]);
    }
}

class Planner {
    constructor(problem) {
        this.problem = problem;
    }
    generatePlan() {
        // Placeholder for generating plan logic based on the problem definition
        return this.problem.actions.map(({ action, params }) => action.toString(...params));
    }
}

class Heuristic {
    static calculate(state, goal) {
        // Example heuristic calculation
        return Object.keys(goal).reduce((acc, key) => acc + (state.vars[key] === goal[key] ? 0 : 1), 0);
    }
}

// Usage example
(() => {
    const domain = new PlanningDomain()
        .addAction(new Action('move', ['from', 'to'],
            [state => state.location === 'home'],
            {location: 'work'},
            1));

    const problem = new PlanningProblem(domain, {location: 'home'}, {location: 'work'})
        .addAction('move', 'home', 'work');

    console.log('Initial State:', problem.initState.vars);
    console.log('Goal:', problem.goal);
    console.log('Goal Achieved:', problem.goalAchieved());

    const planner = new Planner(problem);
    console.log('Generated Plan:', planner.generatePlan());
})();
