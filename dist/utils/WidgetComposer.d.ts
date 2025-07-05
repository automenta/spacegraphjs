export class WidgetComposer {
    static presets: Map<any, any>;
    static templates: Map<any, any>;
    static registerPreset(name: any, config: any): void;
    static registerTemplate(name: any, template: any): void;
    static createDashboard(space: any, position: any, config: any): any;
    static createControlCenter(space: any, position: any, systems?: any[]): any;
    static createMonitoringDashboard(space: any, position: any, metrics?: any[]): any;
    static createWorkflowBuilder(space: any, position: any, steps?: any[]): any;
    static createAnalyticsDashboard(space: any, position: any, analytics?: {}): any;
    static createFormBuilder(space: any, position: any, formConfig?: {}): any;
    static createDataVisualization(space: any, position: any, datasets?: any[]): any;
    static createGameHUD(space: any, position: any, gameConfig?: {}): any;
    static connectWidgets(space: any, sourceWidget: any, targetWidget: any, connectionType?: string): any;
    static propagateData(event: any, targetWidget: any, connectionType: any): void;
    static exportConfiguration(metaWidget: any): {
        type: string;
        layout: any;
        position: {
            x: any;
            y: any;
            z: any;
        };
        data: any;
    };
    static importConfiguration(space: any, config: any): any;
    static createWidgetLibrary(): {
        slider: (id: any, label: any, value?: number, min?: number, max?: number) => {
            id: any;
            type: string;
            data: {
                title: string;
                controls: {
                    id: any;
                    type: string;
                    label: any;
                    value: number;
                    min: number;
                    max: number;
                }[];
            };
        };
        button: (id: any, label: any, text: any) => {
            id: any;
            type: string;
            data: {
                title: string;
                controls: {
                    id: any;
                    type: string;
                    label: any;
                    text: any;
                }[];
            };
        };
        progressBar: (id: any, label: any, value?: number, max?: number) => {
            id: any;
            type: string;
            data: {
                label: any;
                progressType: string;
                value: number;
                max: number;
            };
        };
        gauge: (id: any, label: any, value?: number, max?: number) => {
            id: any;
            type: string;
            data: {
                label: any;
                progressType: string;
                value: number;
                max: number;
            };
        };
        infoPanel: (id: any, text: any, icon?: string) => {
            id: any;
            type: string;
            data: {
                text: any;
                icon: string;
            };
        };
        chart: (id: any, title: any, chartType?: string) => {
            id: any;
            type: string;
            data: {
                title: any;
                chartType: string;
            };
        };
    };
}
export default WidgetComposer;
