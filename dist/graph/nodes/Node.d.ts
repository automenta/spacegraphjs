export class Node {
    constructor(id: any, position?: {
        x: number;
        y: number;
        z: number;
    }, data?: {}, mass?: number);
    space: any;
    position: any;
    data: {};
    mass: number;
    id: any;
    mesh: any;
    cssObject: any;
    labelObject: any;
    isPinned: boolean;
    getDefaultData(): {
        label: string;
    };
    update(_space: any): void;
    dispose(): void;
    getBoundingSphereRadius(): number;
    setSelectedStyle(_selected: any): void;
    setPosition(pos: any, y: any, z: any): void;
    startDrag(): void;
    drag(newPosition: any): void;
    endDrag(): void;
}
