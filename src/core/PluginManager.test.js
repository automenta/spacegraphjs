import { describe, it, expect, vi } from 'vitest';
import { PluginManager } from './PluginManager.js';
import { Plugin } from './Plugin.js';

const mockSpaceGraph = {
    emit: vi.fn(),
};

class MockPlugin extends Plugin {
    customName = 'TestPlugin';
    isInitialized = false;
    isDisposed = false;
    isUpdated = false;

    constructor(space, manager, nameOverride = null) {
        super(space, manager);
        if (nameOverride) {
            this.customName = nameOverride;
        }
        this.init = vi.fn(() => {
            this.isInitialized = true;
        });
        this.dispose = vi.fn(() => {
            this.isDisposed = true;
        });
        this.update = vi.fn(() => {
            this.isUpdated = true;
        });
    }

    getName() {
        return this.customName;
    }
}

describe('PluginManager', () => {
    it('should correctly instantiate', () => {
        const pm = new PluginManager(mockSpaceGraph);
        expect(pm).toBeInstanceOf(PluginManager);
        expect(pm.plugins).toEqual([]);
        expect(pm.pluginMap.size).toBe(0);
    });

    it('should register a plugin', () => {
        const pm = new PluginManager(mockSpaceGraph);
        const plugin = new MockPlugin(mockSpaceGraph, pm);
        pm.add(plugin);
        expect(pm.plugins).toContain(plugin);
        expect(pm.pluginMap.get(plugin.getName())).toBe(plugin);
    });

    it('should not register a plugin with a duplicate name', () => {
        const pm = new PluginManager(mockSpaceGraph);
        const plugin1 = new MockPlugin(mockSpaceGraph, pm, 'DuplicateNamePlugin');
        const plugin2 = new MockPlugin(mockSpaceGraph, pm, 'DuplicateNamePlugin');
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        pm.add(plugin1);
        pm.add(plugin2);

        expect(pm.plugins.length).toBe(1);
        expect(pm.plugins[0]).toBe(plugin1);
        expect(pm.pluginMap.size).toBe(1);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
            'PluginManager: Plugin with name "DuplicateNamePlugin" is already registered. Skipping.'
        );
        consoleWarnSpy.mockRestore();
    });

    it('should not register an invalid plugin object', () => {
        const pm = new PluginManager(mockSpaceGraph);
        const invalidPlugin = { name: 'InvalidPlugin' };
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        pm.add(invalidPlugin);

        expect(pm.plugins.length).toBe(0);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            'PluginManager: Attempted to register an invalid plugin.',
            invalidPlugin
        );
        consoleErrorSpy.mockRestore();
    });

    it('should initialize all registered plugins', async () => {
        const pm = new PluginManager(mockSpaceGraph);
        const plugin1 = new MockPlugin(mockSpaceGraph, pm, 'Plugin1');
        const plugin2 = new MockPlugin(mockSpaceGraph, pm, 'Plugin2');
        pm.add(plugin1);
        pm.add(plugin2);

        await pm.initPlugins();

        expect(plugin1.init).toHaveBeenCalled();
        expect(plugin1.isInitialized).toBe(true);
        expect(plugin2.init).toHaveBeenCalled();
        expect(plugin2.isInitialized).toBe(true);
    });

    it('should call update on all registered plugins', () => {
        const pm = new PluginManager(mockSpaceGraph);
        const plugin1 = new MockPlugin(mockSpaceGraph, pm, 'Plugin1');
        const plugin2 = new MockPlugin(mockSpaceGraph, pm, 'Plugin2');
        pm.add(plugin1);
        pm.add(plugin2);

        pm.updatePlugins();

        expect(plugin1.update).toHaveBeenCalled();
        expect(plugin1.isUpdated).toBe(true);
        expect(plugin2.update).toHaveBeenCalled();
        expect(plugin2.isUpdated).toBe(true);
    });

    it('should dispose all registered plugins in reverse order', () => {
        const pm = new PluginManager(mockSpaceGraph);
        const plugin1 = new MockPlugin(mockSpaceGraph, pm, 'Plugin1');
        const plugin2 = new MockPlugin(mockSpaceGraph, pm, 'Plugin2');
        const disposeOrder = [];

        plugin1.dispose = vi.fn(() => {
            disposeOrder.push('Plugin1');
            plugin1.isDisposed = true;
        });
        plugin2.dispose = vi.fn(() => {
            disposeOrder.push('Plugin2');
            plugin2.isDisposed = true;
        });

        pm.add(plugin1);
        pm.add(plugin2);
        pm.disposePlugins();

        expect(plugin1.dispose).toHaveBeenCalled();
        expect(plugin1.isDisposed).toBe(true);
        expect(plugin2.dispose).toHaveBeenCalled();
        expect(plugin2.isDisposed).toBe(true);
        expect(disposeOrder).toEqual(['Plugin2', 'Plugin1']);
        expect(pm.plugins.length).toBe(0);
        expect(pm.pluginMap.size).toBe(0);
    });

    it('should retrieve a plugin by name', () => {
        const pm = new PluginManager(mockSpaceGraph);
        const plugin = new MockPlugin(mockSpaceGraph, pm, 'MyNamedPlugin');
        pm.add(plugin);

        const retrievedPlugin = pm.getPlugin('MyNamedPlugin');
        expect(retrievedPlugin).toBe(plugin);
        const notFoundPlugin = pm.getPlugin('NonExistentPlugin');
        expect(notFoundPlugin).toBeUndefined();
    });

    it('should retrieve all plugins', () => {
        const pm = new PluginManager(mockSpaceGraph);
        const plugin1 = new MockPlugin(mockSpaceGraph, pm, 'P1');
        const plugin2 = new MockPlugin(mockSpaceGraph, pm, 'P2');
        pm.add(plugin1);
        pm.add(plugin2);

        const allPlugins = pm.getAllPlugins();
        expect(allPlugins.length).toBe(2);
        expect(allPlugins).toContain(plugin1);
        expect(allPlugins).toContain(plugin2);
    });
});
