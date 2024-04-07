const { Planner, TracingPlanner } = require('./plan2'); // Adjust the import path as necessary

describe('Planner', () => {
    let p;

    beforeEach(() => {
        p = new Planner();
        p.vars = { orderValid: true, paymentSuccess: true, orderConfirmed: false, dispatchConfirmed: false };
        p
            .node("checkOrder", {
                exec: v => {
                    return v.orderValid ? "Order valid" : "Order invalid";
                }
            })
            .node("processPayment", {
                pre: v => v.orderValid,
                exec: v => {
                    if (v.paymentSuccess) {
                        v.paymentProcessed = true;
                        return "Payment processed";
                    } else
                        return "Payment failed";
                }
            })
            .serial("processOrderSteps", ["checkOrder", "processPayment"])
            .parallel("finalizeOrder", ["dispatchOrder", "notifyCustomer"])
            .node("dispatchOrder", {
                pre: v => v.paymentProcessed,
                exec: v => { v.dispatchConfirmed = true; return "Order dispatched"; }
            })
            .node("notifyCustomer", {
                pre: v => v.dispatchConfirmed,
                exec: () => "Customer notified"
            });
    });

    test('processOrderSteps should validate and process payment', async () => {
        await p.run("processOrderSteps");
        expect(p.vars.orderValid).toBe(true);
        expect(p.vars.paymentProcessed).toBe(true);
    });

    test('finalizeOrder should dispatch order and notify customer', async () => {
        // Assuming processOrderSteps needs to be run first
        await p.run("processOrderSteps");
        await p.run("finalizeOrder");
        expect(p.vars.dispatchConfirmed).toBe(true);
    });
});
describe('Smart Home Evening Routine', () => {
    let system, v;

    beforeEach(() => {
        system = new Planner();
        v = system.vars;
        v.currentTime = "18:00";
        v.isWeekend = false;
        v.someoneHome = false;
        v.indoorLights = "off";
        v.outdoorLights = "off";
        v.thermostat = "unset";
        v.tvChannel = "off";
        v.doorsLocked = true;
        v.securityCameras = "off";

        system = new TracingPlanner(system)

        system
            .node("checkEvening", {
                exec: v => v.currentTime >= "17:00" && v.currentTime <= "21:00" ? "Evening confirmed" : "Not evening",
            })
            .node("detectPresence", {
                exec: v => {
                    v.someoneHome = true; // Simulating someone arriving home
                    return v.someoneHome ? "Someone is home" : "No one is home"
                }
            })
            .serial("lighting", ["detectPresence", "checkEvening", "adjustLighting"], 1)
            .node("adjustLighting", {
                pre: v => v.currentTime >= "17:00" && v.currentTime <= "21:00",
                exec: v => {
                    v.indoorLights = v.someoneHome ? "on" : "off";
                    v.outdoorLights = v.someoneHome ? "off" : "on";
                    return "Lights adjusted";
                }
            })
            .node("temperatureAdjustment", {
                pre: v => v.someoneHome,
                exec: v => {
                    v.thermostat = "21°C";
                    return "Thermostat adjusted";
                }
            })
            .node("entertainmentSetup", {
                pre: v => v.isWeekend && v.someoneHome,
                exec: v => {
                    v.tvChannel = "Movie Channel";
                    return "TV set to movie channel";
                }
            })
            .node("securityCheck", {
                exec: v => {
                    v.doorsLocked = true;
                    v.securityCameras = "on";
                    return "Security check completed";
                }
            })
            .parallel("eveningRoutine", [
                "lighting", "temperatureAdjustment",
                "entertainmentSetup", "securityCheck"], 2);
    });

    test('Evening routine execution', async () => {
        await system.run("eveningRoutine");
        expect(v.indoorLights).toBe("on");
        expect(v.outdoorLights).toBe("off");
        expect(v.tvChannel).toBe("off"); // Assuming it's not the weekend
        expect(v.doorsLocked).toBe(true);
        expect(v.securityCameras).toBe("on");
        //expect(v.thermostat).toBe("21°C");
    });
});
