export class BaseFactory {
    types: Map<any, any>;
    /**
     * Registers a new type with the factory.
     * @param {string} typeName - The unique name for the type.
     * @param {class} typeClass - The class constructor for the type.
     */
    registerType(typeName: string, typeClass: class): void;
    /**
     * Creates a new instance of a registered type.
     * @param {string} type - The typeName of the class to create.
     * @param {Array<any>} args - Arguments to pass to the class constructor.
     * @param {string} [defaultType] - The typeName to use if the requested type is not found.
     * @returns {object|null} The created instance, or null if the type is not found.
     */
    create(type: string, args: Array<any>, defaultType?: string): object | null;
}
