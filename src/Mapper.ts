export class Mapper<TLight = any, TDark = any> {
	private lightFactory?: Mapper.Factory<TLight, TDark>;
	private darkFactory?: Mapper.Factory<TDark, TLight>;
	private nameTransformer?: Mapper.NameTransformer<TDark>;
	private fieldMap: Map<keyof TLight, keyof TDark> = new Map();
	private reverseFieldMap: Map<keyof TDark, keyof TLight> = new Map();
	private toLightTransformers: Map<keyof TLight, Mapper.Transformer<any, any>> = new Map();
	private toDarkTransformers: Map<keyof TDark, Mapper.Transformer<any, any>> = new Map();
	private partialMappings: Array<Mapper.PartialMapping<TLight, TDark>> = [];

	static create<TLight = any, TDark = any>() {
		return new Mapper<TLight, TDark>();
	}

	/**
	 * Tells mapper to use factory to produce final result at the end of mapping process.
	 */
	useFactory(factory: Mapper.Factory<TLight, TDark>): this {
		this.lightFactory = factory;
		return this;
	}

	useLightFactory = this.useFactory.bind(this);

	useDarkFactory(factory: Mapper.Factory<TDark, TLight>): this {
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

	usePartialMapping(mapping: Mapper.PartialMapping<TLight, TDark>): this {
		this.partialMappings.push(mapping);
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
		let data: any = {};
		for (const [lightName, darkName] of this.fieldMap) {
			data[darkName] = this.transformValueFromLight(lightName, light[lightName]);
		}
		for (const {toDark} of this.partialMappings) {
			if (toDark) {
				data = toDark(light);
			}
		}
		return this.darkFactory ? this.darkFactory(data, light) : data;
	}

	mapPartialToDark(light: Partial<TLight>, useFactory: boolean = false): Partial<TDark> {
		let data: any = {};
		for (const [lightName, darkName] of this.fieldMap) {
			if (lightName in light) {
				data[darkName] = this.transformValueFromLight(lightName, light[lightName]);
			}
		}
		for (const {toDark} of this.partialMappings) {
			if (toDark) {
				data = toDark(light);
			}
		}
		if (useFactory && this.darkFactory) {
			return this.darkFactory(data, light);
		}
		return data;
	}

	arrayMapToDark(values: TLight[]): TDark[] {
		return values.map(this.mapToDark, this);
	}

	arrayMapPartialToDark(values: Array<Partial<TLight>>, useFactory: boolean = false): Array<Partial<TDark>> {
		return values.map(x => this.mapPartialToDark(x, useFactory));
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

	mapPartialToLight(dark: Partial<TDark>, useFactory: boolean = false): Partial<TLight> {
		let data: any = {};
		for (const [lightName, darkName] of this.fieldMap) {
			if (darkName in dark) {
				data[lightName] = this.transformValueFromDark(darkName, dark[darkName]);
			}
		}
		for (const {toLight} of this.partialMappings) {
			if (toLight) {
				data = toLight(dark);
			}
		}
		if (useFactory && this.lightFactory) {
			return this.lightFactory(data, dark);
		}
		return data;
	}

	/**
	 * Maps object from dark to light side
	 */
	mapToLight(dark: TDark): TLight {
		let data: any = {};
		for (const [lightName, darkName] of this.fieldMap) {
			data[lightName] = this.transformValueFromDark(darkName, dark[darkName]);
		}
		for (const {toLight} of this.partialMappings) {
			if (toLight) {
				data = toLight(dark);
			}
		}
		return this.lightFactory ? this.lightFactory(data, dark) : data;
	}

	arrayMapToLight(values: TDark[]): TLight[] {
		return values.map(this.mapToLight, this);
	}

	arrayMapPartialToLight(values: Array<Partial<TDark>>, useFactory: boolean = false): Array<Partial<TLight>> {
		return values.map(x => this.mapPartialToLight(x, useFactory));
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
	export type Factory<T, TOriginal> = (data: any, originalObject: TOriginal | Partial<TOriginal>) => T;

	export type NameTransformer<TDark> = (name: string) => keyof TDark;

	export type Transformer<TA, TB> = (value: TA) => TB;

	export interface PartialMapping<TLight, TDark> {
		toDark?: (value: Partial<TLight>) => Partial<TDark>;
		toLight?: (value: Partial<TDark>) => Partial<TLight>;
	}
}
