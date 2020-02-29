export class Mapper<TLight = any, TDark = any> {
    private lightFactory?: Mapper.Factory<TLight>;
    private darkFactory?: Mapper.Factory<TDark>;
    private nameTransformer?: Mapper.NameTransformer<TDark>;
    private fieldMap: Map<keyof TLight, keyof TDark> = new Map();
    private reverseFieldMap: Map<keyof TDark, keyof TLight> = new Map();
    private toLightTransformers: Map<keyof TLight, Mapper.Transformer<any, any>> = new Map();
    private toDarkTransformers: Map<keyof TDark, Mapper.Transformer<any, any>> = new Map();

    static create<TLight = any, TDark = any>() {
        return new Mapper<TLight, TDark>();
    }

    /**
     * Tells mapper to use factory to produce final result at the end of mapping process.
     */
    useFactory(factory: Mapper.Factory<TLight>): this {
        this.lightFactory = factory;
        return this;
    }

    useLightFactory = this.useFactory.bind(this);

    useDarkFactory(factory: Mapper.Factory<TDark>): this {
        this.darkFactory = factory;
        return this;
    }

    /**
     * If name of property on dark side is not provided then
     * given name transformer is applied to produce property name for dark side
     *
     * Register name transformer before mapping registration.
     */
    useNameTransformer(nameTransformer: Mapper.NameTransformer<TDark>): this {
        this.nameTransformer = nameTransformer;
        return this;
    }

    /**
     * Registers mapping of field on light side to field on dark side.
     * If name of the field on dark side is not provided then it's computed with
     * name transformer and if that is not provided then name from light side is used.
     */
    registerMapping<TLightType = any, TDarkType = any>(lightName: keyof TLight, darkName?: keyof TDark, options?: {
        toLightTransformer?: Mapper.Transformer<TDarkType, TLightType>;
        toDarkTransformer?: Mapper.Transformer<TLightType, TDarkType>;
    }): this {
        const finalDarkName = darkName ? darkName : this.getDarkName(lightName);
        this.fieldMap.set(lightName, finalDarkName);
        this.reverseFieldMap.set(finalDarkName, lightName);

        if (options?.toDarkTransformer) {
            this.toDarkTransformers.set(finalDarkName, options.toDarkTransformer);
        }

        if (options?.toLightTransformer) {
            this.toLightTransformers.set(lightName, options.toLightTransformer);
        }
        return this;
    }

    private getDarkName(lightName: keyof TLight): keyof TDark {
        if (typeof lightName === 'string') {
            return this.nameTransformer ? this.nameTransformer(lightName) : lightName as any;
        }
        return lightName as any;
    }

    /**
     * Maps object from light side to dark side
     */
    mapToDark(light: TLight): TDark {
        const data: any = {};
        for (const [lightName, darkName] of this.fieldMap) {
            data[darkName] = this.transformValueFromLight(lightName, light[lightName]);
        }
        return this.darkFactory ? this.darkFactory(data) : data;
    }

    arrayMapToDark(values: TLight[]): TDark[] {
        return values.map(this.mapToDark, this);
    }

    getDarkNameFromLightName(lightName: keyof TLight): keyof TDark | undefined {
        return this.fieldMap.get(lightName);
    }

    getLightNameFromDarkName(darkName: keyof TDark): keyof TLight | undefined {
        return this.reverseFieldMap.get(darkName);
    }

    getLightNames() {
        return Array.from(this.fieldMap.keys());
    }

    getDarkNames() {
        return Array.from(this.reverseFieldMap.keys());
    }

    /**
     * Maps object from dark to light side
     */
    mapToLight(dark: TDark): TLight {
        const data: any = {};
        for (const [lightName, darkName] of this.fieldMap) {
            data[lightName] = this.transformValueFromDark(darkName, dark[darkName]);
        }
        return this.lightFactory ? this.lightFactory(data) : data;
    }

    arrayMapToLight(values: TDark[]): TLight[] {
        return values.map(this.mapToLight, this);
    }

    transformValueFromDark(darkName: keyof TDark, value: any) {
        const transformer = this.toLightTransformers.get(this.getLightNameFromDarkName(darkName)!);
        return transformer ? transformer(value) : value;
    }

    transformValueFromLight(lightName: keyof TLight, value: any) {
        const transformer = this.toDarkTransformers.get(this.getDarkNameFromLightName(lightName)!);
        return transformer ? transformer(value) : value;
    }
}

export namespace Mapper {
    export type Factory<T> = (data: any) => T;

    export type NameTransformer<TDark> = (name: string) => keyof TDark;

    export type Transformer<A, B> = (value: A) => B;
}