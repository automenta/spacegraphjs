export class BaseFactory {
    constructor() {
        this.types = new Map();
    }

    /**
     * Registers a new type with the factory.
     * @param {string} typeName - The unique name for the type.
     * @param {class} typeClass - The class constructor for the type.
     */
    registerType(typeName, typeClass) {
        if (!typeName) {
            throw new Error(`${this.constructor.name}: Attempted to register a class without a typeName.`);
        }
        if (this.types.has(typeName)) {
            // console.warn(`${this.constructor.name}: Type "${typeName}" already registered. Overwriting.`);
        }
        this.types.set(typeName, typeClass);
    }

    /**
     * Creates a new instance of a registered type.
     * @param {string} type - The typeName of the class to create.
     * @param {Array<any>} args - Arguments to pass to the class constructor.
     * @param {string} [defaultType] - The typeName to use if the requested type is not found.
     * @returns {object|null} The created instance, or null if the type is not found.
     */
    create(type, args, defaultType = null) {
        const TypeClass = this.types.get(type) || (defaultType ? this.types.get(defaultType) : null);

        if (!TypeClass) {
            console.warn(`${this.constructor.name}: Type "${type}" not found and no default type available.`);
            return null;
        }

        return new TypeClass(...args);
    }
}
