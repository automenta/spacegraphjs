export class Edge {
    static typeName: string;
    static HIGHLIGHT_COLOR: number;
    static DEFAULT_OPACITY: number;
    static HIGHLIGHT_OPACITY: number;
    static DEFAULT_HOVER_OPACITY_BOOST: number;
    static DEFAULT_HOVER_THICKNESS_MULTIPLIER: number;
    constructor(id: any, sourceNode: any, targetNode: any, data?: {});
    line: any;
    arrowheads: {
        source: any;
        target: any;
    };
    isInstanced: boolean;
    instanceId: any;
    isHighlighted: boolean;
    isHovered: boolean;
    _colorStart: any;
    _colorEnd: any;
    data: {
        color: number;
        gradientColors: any;
        thickness: number;
        thicknessInstanced: number;
        constraintType: string;
        constraintParams: {
            stiffness: number;
            idealLength: number;
        };
        arrowhead: boolean;
        arrowheadSize: number;
        arrowheadColor: any;
    };
    id: any;
    source: any;
    target: any;
    _createArrowheads(): void;
    _createLine(): any;
    _setGradientColors(): void;
    update(): void;
    _updateArrowheads(): void;
    _createSingleArrowhead(_type: any): any;
    _orientArrowhead(arrowhead: any, direction: any): void;
    setHighlight(highlight: any): void;
    setHoverStyle(hovered: any, force?: boolean): void;
    updateResolution(width: any, height: any): void;
    dispose(): void;
}
