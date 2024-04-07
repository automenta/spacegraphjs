const {
    PlanNode,
    ParallelNode,
    ConditionalNode,
    PlanGraph,
    Planner,
    PlanEdge
} = require('./plan');


describe('Planner Framework Tests', () => {
    test('PlanNode creation', () => {
        const n = new PlanNode('testNode', 'Task', {}, {}, 10);
        expect(n.id).toBe('testNode');
        expect(n.cost).toBe(10);
    });

    test('ParallelNode creation and inheritance', () => {
        const p = new ParallelNode('parallelTest');
        expect(p instanceof PlanNode).toBeTruthy();
        expect(p.id).toBe('parallelTest');
    });

    test('ConditionalNode evaluates condition correctly', () => {
        const conditionFunction = () => true;
        const conditionalNode = new ConditionalNode('condNode', 'Condition', {}, 0, conditionFunction);
        expect(conditionalNode.evalCondition()).toBe(true);
    });

    describe('PlanGraph functionality', () => {
        let g;
        beforeEach(() => {
            g = new PlanGraph();
            g.addNode(new PlanNode('node1', 'Task'));
            g.addNode(new PlanNode('node2', 'Task'));
            g.addEdge(new PlanEdge('node1', 'node2', 'transition'));
        });

        test('getNode retrieves correct node', () => {
            const node = g.getNode('node1');
            expect(node).toBeDefined();
            expect(node.id).toBe('node1');
        });

        test('addChildNode adds child correctly', () => {
            g.addChildNode('node1', new PlanNode('childNode', 'Task'));
            const children = g.getChildNodes('node1');
            expect(children.some(n => n.id === 'childNode')).toBeTruthy();
        });
    });


});

describe('Advanced Planner Framework Tests', () => {
    test('PlanEdge creation and properties', () => {
        const e = new PlanEdge('source', 'target', 'relation', {condition: true}, {effect: true}, 5);
        expect(e.sourceId).toBe('source');
        expect(e.targetId).toBe('target');
        expect(e.relation).toBe('relation');
        expect(e.conditions).toEqual({condition: true});
        expect(e.effects).toEqual({effect: true});
        expect(e.cost).toBe(5);
    });

    describe('PlanGraph advanced functionalities', () => {
        let g;
        beforeEach(() => {
            g = new PlanGraph();
            g.addNode(new PlanNode('parent', 'Task'));
            g.addNode(new PlanNode('child1', 'Task'));
            g.addChildNode('parent', new PlanNode('child2', 'Task'));
            g.addEdge(new PlanEdge('parent', 'child1', 'relation'));
        });

        test('removeNode removes node and associated edges correctly', () => {
            g.removeNode('child1');
            expect(g.getNode('child1')).toBeUndefined();
            expect(g.getEdgesByNodeArray('parent').length).toBe(1); // Only one edge should remain
        });

        test('getChildNodes returns correct child nodes', () => {
            const children = g.getChildNodes('parent');
            expect(children.length).toBe(2);
            expect(children.find(n => n.id === 'child2')).toBeDefined();
        });
    });

    describe('Planner complex plan execution', () => {
        test('Plan with parallel nodes', () => {
            const p = new Planner({});

            p.graph.addNode(new ParallelNode('parallelNode'));
            p.graph.addChildNode('parallelNode', new PlanNode('child1', 'Task'));
            p.graph.addChildNode('parallelNode', new PlanNode('child2', 'Task'));

            const plan = p.plan('parallelNode', 'parallelNode');
            expect(plan.length).toBe(2); // Expecting two tasks from the parallel node
            expect(plan.find(p => p.id === 'child1')).toBeDefined();
            expect(plan.find(p => p.id === 'child2')).toBeDefined();
        });
    });
});

describe('Decomposition and Transition Handling Pre-Tests', () => {
    let p;
    beforeEach(() => {
        p = new Planner();
    });

    test('Parent task is not included when decomposed into subtasks', () => {
        p.addTask('parentTask', 'Parent Task');
        p.addAction('subTask1', 'Subtask 1', {}, {}, 1);
        p.addDecomposition('parentTask', 'subTask1');

        const plan = p.plan('parentTask', 'parentTask');
        expect(plan.map(p => p.id)).not.toContain('parentTask');
        expect(plan.map(p => p.id)).toContain('subTask1');
    });

    test('Initial state is not included in the plan when transitioning', () => {
        p.vars.initialState = true;

        p.addState('initialState', 'Initial State');
        p.addAction('transitionAction', 'Transition Action',
            { initialState: true }, { initialState: false, finalState: true }, 1);
        p.addTransition('initialState', 'transitionAction');

        const plan = p.plan('initialState', 'finalState');
        expect(plan.map(p => p.id)).not.toContain('initialState');
        expect(plan.map(p => p.id)).toContain('transitionAction');
    });
});

describe('Decomposition and Transition Tests', () => {
    let p;
    beforeEach(() => {
        p = new Planner();
    });

    test('Task decomposition leads to correct plan generation', () => {
        p.addTask('prepareReport', 'Prepare report');
        p.addAction('collectData', 'Collect necessary data', {}, { dataCollected: true }, 5);
        p.addAction('writeReport', 'Write report', { dataCollected: true }, { reportWritten: true }, 10);
        p.addDecomposition('prepareReport', 'collectData');
        p.addDecomposition('prepareReport', 'writeReport');

        const plan = p.plan('prepareReport', 'prepareReport');
        expect(plan.map(p => p.id)).toEqual(['collectData', 'writeReport']);
    });

    test('Transitions between states are correctly utilized in planning', () => {
        p.vars.atHome = true;
        p.addState('atHome', 'At home');
        p.addState('atOffice', 'At office');
        p.addAction('commuteToOffice', 'Commute to the office', { atHome: true }, { atHome: false, atOffice: true }, 15);
        p.addTransition('atHome', 'commuteToOffice');

        const plan = p.plan('atHome', 'atOffice');
        expect(plan.map(p => p.id)).toContain('commuteToOffice');
    });
});

describe('Real-world Scenario Tests', () => {
    test('Project management scenario with tasks and subtasks', () => {
        const p = new Planner({});
        p.addTask('launchProduct', 'Launch Product');
        p.addAction('developProduct', 'Develop Product', {}, { productDeveloped: true }, 50);
        p.addAction('marketProduct', 'Market Product', { productDeveloped: true }, { productLaunched: true }, 20);
        p.addDecomposition('launchProduct', 'developProduct');
        p.addDecomposition('launchProduct', 'marketProduct');

        const plan = p.plan('launchProduct', 'launchProduct');
        expect(plan.map(p => p.id)).toEqual(['developProduct', 'marketProduct']);
    });

    // test('Travel planning from home to destination with multiple modes of transport', () => {
    //     const p = new Planner({ atHome: true, atDestination: false });
    //     p.addState('home', 'Home');
    //     p.addState('airport', 'Airport');
    //     p.addState('destination', 'Destination');
    //
    //     p.addAction('driveToAirport', 'Drive to the airport', { atHome: true }, { atHome: false, atAirport: true }, 10);
    //     p.addTransition('home', 'driveToAirport');
    //
    //     p.addAction('flyToDestination', 'Fly to the destination', { atAirport: true }, { atDestination: true }, 100);
    //     p.addTransition('airport', 'flyToDestination');
    //
    //     let iterRemain = 5;
    //     let state = 'home';
    //     do {
    //         const plan = p.plan(state, 'destination');
    //         expect(plan.length).toBeGreaterThan(0);
    //         //console.log(plan);
    //         state = plan[0].id
    //     } while (state!=='destination' && --iterRemain > 0);
    //
    //     //expect(plan.map(p => p.id)).toEqual(['driveToAirport', 'flyToDestination']);
    // });
});
describe('Further Decomposition and Transition Tests', () => {
    let planner;

    beforeEach(() => {
        planner = new Planner();
    });

    test('Decomposition with multiple subtasks', () => {
        planner.addTask('completeProject', 'Complete Project');
        planner.addAction('research', 'Do research', {}, { researchDone: true }, 2);
        planner.addAction('draft', 'Draft document', { researchDone: true }, { draftComplete: true }, 3);
        planner.addAction('review', 'Review draft', { draftComplete: true }, { reviewComplete: true }, 1);
        planner.addDecomposition('completeProject', 'research');
        planner.addDecomposition('completeProject', 'draft');
        planner.addDecomposition('completeProject', 'review');

        const plan = planner.plan('completeProject', 'completeProject');
        expect(plan.map(p => p.id)).toEqual(['research', 'draft', 'review']);
    });

    test('Transitions with conditions and effects', () => {
        planner.vars.awake = true;
        planner.addState('awake', 'Awake');
        planner.addState('working', 'Working');
        planner.addState('resting', 'Resting');
        planner.addAction('startWorking', 'Start working', { awake: true }, { working: true }, 5);
        planner.addAction('takeBreak', 'Take a break', { working: true }, { resting: true }, 2);
        planner.addTransition('awake', 'startWorking');
        planner.addTransition('working', 'takeBreak');

        const plan = planner.plan('awake', 'resting');
        expect(plan.map(p => p.id)).toEqual(['startWorking', 'takeBreak']);
    });
});
describe('Conditional Node Evaluation Tests', () => {
    test('Conditional execution based on external variable', () => {
        const planner = new Planner({ hasData: false });
        planner.addTask('analyzeData', 'Analyze data');
        planner.addAction('collectData', 'Collect Data', {}, { hasData: true }, 4);
        const conditionFunction = () => planner.vars.hasData;
        planner.graph.addNode(new ConditionalNode('conditionalAnalysis', 'Analyze Data If Collected', {}, 0, conditionFunction));

        // Before collecting data
        let plan = planner.plan('analyzeData', 'conditionalAnalysis');
        expect(plan.length).toBe(0); // Conditional node should not be executed

        // After collecting data
        //planner.executeNode({ id: 'collectData', effects: { hasData: true } });
        plan = planner.plan('analyzeData', 'conditionalAnalysis');
        expect(plan.map(p => p.id)).toContain('conditionalAnalysis'); // Now conditional node should be executed
    });
});
describe('Edge Case Handling', () => {
    test('Handling of cyclic dependencies', () => {
        const planner = new Planner();
        planner.addTask('task1', 'Task 1');
        planner.addTask('task2', 'Task 2');
        planner.addDecomposition('task1', 'task2');
        planner.addDecomposition('task2', 'task1'); // Creates a cycle

        expect(() => planner.plan('task1', 'task2')).toThrow('Cyclic dependency detected');
    });

    test('Unreachable goal due to conditions', () => {
        const planner = new Planner({ ready: false });
        planner.addState('start', 'Start');
        planner.addAction('reachGoal', 'Reach Goal', { ready: true }, { goalReached: true }, 1);
        planner.addTransition('start', 'reachGoal');

        const plan = planner.plan('start', 'reachGoal');
        expect(plan.length).toBe(0); // Goal should be unreachable due to unsatisfied condition
    });
});

// describe('Planner plan async execution', () => {
//     function dummyCond(b) {
//         return new ConditionalNode('condTask', 'Conditional Task', {}, 0,
//             () => Promise.resolve(b));
//     }
//
//     test('Conditional task execution with true condition', async () => {
//         const p = new Planner({});
//         p.graph.addNode(dummyCond(true));
//         const plan = await p.planAsync('condTask');
//         expect(plan.length).toBeGreaterThan(0);
//         expect(plan[0].type).toBe('ConditionalNode');
//     });
//     test('Conditional task execution with false condition', async () => {
//         const p = new Planner({});
//         p.graph.addNode(dummyCond(false));
//         const plan = await p.planAsync('condTask');
//         expect(plan.length).toBe(0);
//     });
//
// });
