export class ControlPanelNode extends HtmlNode {
    controls: Map<any, any>;
    values: Map<any, any>;
    getDefaultData(): {
        type: string;
        title: string;
        controls: any[];
        theme: string;
        backgroundColor: string;
        label: string;
        content: string;
        width: number;
        height: number;
        contentScale: number;
        editable: boolean;
        labelLod: any[];
    };
    _setupPanelInteractions(el: any): void;
    _initializeControls(): void;
    _createControl(control: any): HTMLDivElement;
    _createSlider(control: any): HTMLInputElement;
    _createButton(control: any): HTMLButtonElement;
    _createSwitch(control: any): HTMLLabelElement;
    _createTextInput(control: any): HTMLInputElement;
    _createNumberInput(control: any): HTMLInputElement;
    _createSelect(control: any): HTMLSelectElement;
    _emitControlChange(controlId: any, value: any, control: any): void;
    _bindEvents(): void;
    setValue(controlId: any, value: any): void;
    getValue(controlId: any): any;
    getAllValues(): any;
    addControl(control: any): void;
    removeControl(controlId: any): void;
}
import { HtmlNode } from './HtmlNode.js';
