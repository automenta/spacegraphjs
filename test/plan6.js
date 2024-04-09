class EnhancedSet extends Set {
    add(item) {
        return super.add(item), this;
    }
}

class Predicate extends Array {
    toString() {
        return `(${super.join(' ')})`;
    }
}

class Action {
    constructor(name, params, preconditions = [], effects = [], duration = 0) {
        Object.assign(this, {name, params, preconditions, effects, duration});
    }

    toString() {
        return `${this.name}(${this.params.join(', ')})`;
    }
}

class PlanningDomain {
    constructor() {
        this.types = new EnhancedSet();
        this.predicates = new EnhancedSet();
        this.actions = new EnhancedSet();
    }

    addType(type) {
        return this.types.add(type), this;
    }

    addPredicate(predicate) {
        return this.predicates.add(new Predicate(...predicate.split(/\s*\,\s*/))), this;
    }

    addAction(action) {
        return this.actions.add(action), this;
    }
}

class PlanningProblem {
    constructor(domain, objects = new EnhancedSet(), init = new EnhancedSet(), goal = new EnhancedSet(), numericFluents = new Map(), constraints = new EnhancedSet(), plugins = new Plugins()) {
        Object.assign(this, {domain, objects, init, goal, numericFluents, constraints, plugins});
    }

    isGoalSatisfied(state) {
        return [...this.goal].every(predicate => state.has(predicate.toString()));
    }

    getApplicableActions(state) {
        return [...this.domain.actions].filter(action => action.preconditions.every(precondition => state.has(precondition.toString())));
    }

    applyAction(state, action) {
        const newState = new EnhancedSet(state);
        action.effects.forEach(effect => {
            const effectString = effect.toString();
            effect[0] === 'not' ? newState.delete(effectString) : newState.add(effectString);
        });
        return newState;
    }

    applyPlan(plan) {
        return plan.reduce((state, {action}) => this.applyAction(state, action), new EnhancedSet(this.init));
    }

    async applyPreProcessing(input) {
        const plugin = this.plugins.getPluginByName('PreProcess');
        return plugin ? await plugin.run(input) : input;
    }

    async applyPostProcessing(output) {
        const plugin = this.plugins.getPluginByName('PostProcess');
        return plugin ? await plugin.run(output) : output;
    }
}

class Planner {
    constructor(problem, strategy) {
        Object.assign(this, {problem, strategy});
    }

    async plan() {
        const preProcessedProblem = await this.problem.applyPreProcessing(this.problem);
        const plan = await this.strategy.search(preProcessedProblem);
        return await this.problem.applyPostProcessing(plan);
    }
}

class SearchStrategy {
    constructor(heuristic = null) {
        this.heuristic = heuristic;
    }

    async search(problem) {
        throw new Error('Abstract method');
    }
}

class TransformPlugin {
    constructor(name, transformFunction) {
        Object.assign(this, {name, transformFunction});
    }

    async run(input) {
        return await this.transformFunction(input);
    }
}

class Plugins {
    constructor() {
        this.plugins = new Map();
    }

    add(plugin) {
        this.plugins.set(plugin.name, plugin);
    }

    getPluginByName(name) {
        return this.plugins.get(name);
    }

    getAllPlugins() {
        return Array.from(this.plugins.values());
    }
}

// Usage example, assuming domain, problem setup, and strategy implementation are provided
(async () => {
    const domain = new PlanningDomain().addType('location').addPredicate('at(agent, location)').addAction(new Action('move', ['agent', 'from', 'to'], [new Predicate('at', 'agent', 'from')], [new Predicate('not', new Predicate('at', 'agent', 'from')), new Predicate('at', 'agent', 'to')], 10));
    const problem = new PlanningProblem(domain).addObject('agent1').addObject('location1').addObject('location2').setInitialState(new EnhancedSet().add(new Predicate('at', 'agent1', 'location1'))).setGoalState(new EnhancedSet().add(new Predicate('at', 'agent1', 'location2')));
    const preProcessPlugin = new TransformPlugin('PreProcess', async (input) => {/* Pre-processing logic */
    });
    const postProcessPlugin = new TransformPlugin('PostProcess', async (output) => {/* Post-processing logic */
    });
    problem.plugins.add(preProcessPlugin).add(postProcessPlugin);

    const strategy = new SearchStrategy(); // Placeholder for actual strategy implementation
    const planner = new Planner(problem, strategy);
    const plan = await planner.plan();
    console.log('Plan:', plan);
})();
