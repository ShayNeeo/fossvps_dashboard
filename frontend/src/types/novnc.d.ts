declare module "@novnc/novnc/lib/rfb" {
    export default class RFB {
        constructor(target: HTMLElement, url: string, options?: any);
        addEventListener(type: string, handler: (e: any) => void): void;
        removeEventListener(type: string, handler: (e: any) => void): void;
        sendCtrlAltDel(): void;
        disconnect(): void;
        focus(): void;
        blur(): void;
    }
}
