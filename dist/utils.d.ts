export function $(selector: any, context: any): any;
export function $$(selector: any, context: any): any;
export namespace Utils {
    function clamp(v: any, min: any, max: any): number;
    function lerp(a: any, b: any, t: any): any;
    function generateId(prefix?: string): string;
    let DEG2RAD: number;
    function isObject(item: any): boolean;
    function mergeDeep(target: any, ...sources: any[]): any;
    function toHexColor(numColor: any): string;
}
