import {IMIMEHeaderProps} from "./MIMEHeader.ts";
import {IMIMEBodyProps} from "./MIMEBody.ts";
import {IMIMEAttachProps} from "./MIMEAttach.ts";

export type MIMEProps = IMIMEHeaderProps|IMIMEBodyProps|IMIMEAttachProps;

// MIMEオブジェクトのプロパティをKeyとValueに分割
export type MIMEPropsKey<T extends MIMEProps> = keyof T;
export type MIMEPropsValue<T extends MIMEProps> = T[keyof T];

// MIMEの核となる抽象クラス
export abstract class MIMEBase<T extends Record<MIMEPropsKey<MIMEProps>,MIMEPropsValue<MIMEProps>>> {
    public setProperties(props: Partial<T>): void {
        type MIMETuple = [keyof T, T[keyof T]];
        type MIMERecord = Record<keyof T, T[keyof T]>;
        const entries = <MIMETuple[]>Object.entries(props);
        for (const [key, value] of entries) {
            if (key in this) {
                (<MIMERecord><unknown>this)[key] = value;
            }
        }
    }
}