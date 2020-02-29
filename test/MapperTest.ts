import {snakeCase} from "snake-case";
import {Mapper} from "@src/Mapper";

class Example {
    readonly firstName!: string;
    readonly lastName!: string;
    readonly avatar!: string;

    constructor(data: Example) {
        Object.assign(this, data);
        Object.freeze(this);
    }
}

const DATA = {
    firstName: 'Tom',
    lastName: 'Hardy',
    avatar: 'someurl'
};

describe('Mapper', () => {
    it('using light factory', () => {
        const mapper = Mapper.create<Example>()
            .useFactory(x => new Example(x))
            .registerMapping('firstName')
            .registerMapping('lastName')
            .registerMapping('avatar');

        const result = mapper.mapToLight(DATA);
        expect(result)
            .toStrictEqual(new Example(DATA));
    });

    it('using dark factory', () => {
        const mapper = Mapper.create()
            .registerMapping('firstName')
            .registerMapping('lastName')
            .registerMapping('avatar')
            .useDarkFactory(x => new Example(x));

        const result = mapper.mapToDark(DATA);
        expect(result)
            .toStrictEqual(new Example(DATA));
    });

    describe('registering mapping', () => {
        describe('names', () => {
            describe('as strings', () => {
                it('by default uses light name', () => {
                    const mapper = Mapper.create()
                        .registerMapping('field');

                    expect(mapper.getDarkNameFromLightName('field'))
                        .toEqual('field');
                });

                it('uses provided dark name', () => {
                    const mapper = Mapper.create()
                        .useNameTransformer(x => snakeCase(x))
                        .registerMapping('firstName', 'firstNaaame');

                    expect(mapper.getDarkNameFromLightName('firstName'))
                        .toEqual('firstNaaame');
                });

                it('using name transformer', () => {
                    const mapper = Mapper.create()
                        .useNameTransformer(x => snakeCase(x))
                        .registerMapping('firstName');

                    expect(mapper.getDarkNameFromLightName('firstName'))
                        .toEqual('first_name');
                });
            });

            describe('as numbers', () => {
                it('by default uses light name', () => {
                    const mapper = Mapper.create()
                        .registerMapping(2);

                    expect(mapper.getDarkNameFromLightName(2))
                        .toEqual(2);
                });

                it('uses provided dark name', () => {
                    const mapper = Mapper.create()
                        .useNameTransformer(x => snakeCase(x))
                        .registerMapping(2, 1);

                    expect(mapper.getDarkNameFromLightName(2))
                        .toEqual(1);
                });

                it('ignores name transformer', () => {
                    const mapper = Mapper.create()
                        .useNameTransformer(x => x + 'test')
                        .registerMapping(2);

                    expect(mapper.getDarkNameFromLightName(2))
                        .toEqual(2);
                });
            });

            describe('as symbols', () => {
                const S1 = Symbol('foo');
                const S2 = Symbol('bar');

                it('by default uses light name', () => {
                    const mapper = Mapper.create()
                        .registerMapping(S1);

                    expect(mapper.getDarkNameFromLightName(S1))
                        .toEqual(S1);
                });

                it('uses provided dark name', () => {
                    const mapper = Mapper.create()
                        .useNameTransformer(x => x + '_test')
                        .registerMapping(S1, S2);

                    expect(mapper.getDarkNameFromLightName(S1))
                        .toEqual(S2);

                });

                it('ignores name transformer', () => {
                    const mapper = Mapper.create()
                        .useNameTransformer(x => x + '_test')
                        .registerMapping(S1);

                    expect(mapper.getDarkNameFromLightName(S1))
                        .toEqual(S1);
                });
            })
        });

        describe('transformers', () => {
            it('by default there is no transformer', () => {
                const mapper = Mapper.create()
                    .registerMapping('foo')
                    .registerMapping('bar')

                const data = {
                    foo: 'test',
                    bar: 'test2'
                };

                expect(mapper.mapToDark(data))
                    .toStrictEqual(data);
            });

            it('to dark transformer', () => {
                const mapper = Mapper.create()
                    .registerMapping('foo', undefined, {
                        toDarkTransformer(value: string) {
                            return value.toUpperCase()
                        }
                    })
                    .registerMapping('bar');

                expect(mapper.mapToDark({
                    foo: 'test',
                    bar: 'test2'
                }))
                    .toStrictEqual({
                        foo: 'TEST',
                        bar: 'test2'
                    });
            });

            it('to light transformer', () => {
                const mapper = Mapper.create()
                    .registerMapping('foo', undefined, {
                        toLightTransformer(value: string) {
                            return value.toUpperCase();
                        }
                    })
                    .registerMapping('bar');

                expect(mapper.mapToLight({
                    foo: 'test',
                    bar: 'test2'
                }))
                    .toStrictEqual({
                        foo: 'TEST',
                        bar: 'test2'
                    });
            });
        });
    });

    describe('getting field names', () => {
        const mapper = Mapper.create()
            .useNameTransformer(x => x.toUpperCase())
            .registerMapping('p1', 'p1_dark')
            .registerMapping('p2', 'p2_dark')
            .registerMapping('p3');

        it('from light side', () => {
            expect(mapper.getLightNames())
                .toEqual(['p1', 'p2', 'p3']);
        });

        it('from dark side', () => {
            expect(mapper.getDarkNames())
                .toEqual(['p1_dark', 'p2_dark', 'P3']);
        });
    });

    describe('transforming values for single field', () => {
        describe('from dark to light', () => {
            it('no transformer', () => {
                const mapper = Mapper.create()
                    .registerMapping('foo', 'bar');

                expect(mapper.transformValueFromDark('bar', 'value'))
                    .toStrictEqual('value');
            });

            it('with transformer', () => {
                const mapper = Mapper.create()
                    .registerMapping('foo', 'bar', {
                        toLightTransformer(value: string) {
                            return value.toUpperCase();
                        }
                    });

                expect(mapper.transformValueFromDark('bar', 'value'))
                    .toStrictEqual('VALUE');
                1
            });
        });

        describe('from light to dark', () => {
            it('no transformer', () => {
                const mapper = Mapper.create()
                    .registerMapping('foo', 'bar');

                expect(mapper.transformValueFromLight('foo', 'value'))
                    .toStrictEqual('value');
            });

            it('with transformer', () => {
                const mapper = Mapper.create()
                    .registerMapping('foo', 'bar', {
                        toDarkTransformer(value: string) {
                            return value.toUpperCase();
                        }
                    });

                expect(mapper.transformValueFromLight('foo', 'value'))
                    .toStrictEqual('VALUE');
            });
        });
    });

    describe('mapping arrays', () => {
        const mapper = Mapper.create()
            .registerMapping('foo', 'bar');

        it('to dark side', () => {
            expect(
                mapper.arrayMapToDark([
                    {foo: 'test1'},
                    {foo: 'test2'}
                ])
            )
                .toStrictEqual([
                    {bar: 'test1'},
                    {bar: 'test2'}
                ]);
        });

        it('to light side', () => {
            expect(
                mapper.arrayMapToLight([
                    {bar: 'test1'},
                    {bar: 'test2'}
                ])
            )
                .toStrictEqual([
                    {foo: 'test1'},
                    {foo: 'test2'}
                ])
        })
    });


    describe('complex examples', () => {
        it('with all properties types', () => {
            const sym = Symbol('foo');

            const lightSym = Symbol('lightSymbol');
            const darkSym = Symbol('darkSymbol');

            const mapper = Mapper.create()
                .registerMapping(sym)
                .registerMapping(lightSym, darkSym)
                .registerMapping('foo', 'bar')
                .registerMapping(3, 1);

            const DARK = {
                [sym]: 'value1',
                [darkSym]: 'value2',
                bar: 'value3',
                1: 'value4'
            };

            const LIGHT = {
                [sym]: 'value1',
                [lightSym]: 'value2',
                foo: 'value3',
                3: 'value4'
            };
            expect(mapper.mapToDark(LIGHT))
                .toStrictEqual(DARK);

            expect(mapper.mapToLight(DARK))
                .toStrictEqual(LIGHT);
        });
    });
});