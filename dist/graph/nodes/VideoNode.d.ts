export class VideoNode extends Node {
    static typeName: string;
    static DEFAULT_WIDTH: number;
    static DEFAULT_HEIGHT: number;
    constructor(id: any, position: any, data?: {}, mass?: number);
    htmlElement: any;
    videoElement: any;
    size: {
        width: number;
        height: number;
    };
    getDefaultData(): {
        label: string;
        videoUrl: string;
        videoType: string;
        autoplay: boolean;
        loop: boolean;
        controls: boolean;
        muted: boolean;
        width: number;
        height: number;
        type: string;
        backgroundColor: string;
    };
    _createElement(): HTMLDivElement;
    setVideoUrl(url: any, type: any): void;
}
import { Node } from './Node.js';
