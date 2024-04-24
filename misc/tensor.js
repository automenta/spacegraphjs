const A = Array.from;

class Tensor {
    constructor(data, shp, autograd = false) {
        Object.assign(this, { data, shp, autograd, grad: null, creators: [], creationOp: null });
    }

    static from(shp, filler, autograd = false) {
        return new Tensor(A(shp.reduce((a, b) => a * b), () => typeof filler === 'function' ? filler() : filler), shp, autograd);
    }

    setCreators(creators, creationOp) {
        Object.assign(this, { creators, creationOp, autograd: creators.some(c => c.autograd) });
        return this;
    }

    backward(grad = null) {
        if (!this.autograd || !this.creationOp) return;
        this.grad = grad || A(this.data.length, () => 0);
        const grads = operations[this.creationOp].backward(this.grad, ...this.creators);
        this.creators.forEach((creator, idx) => creator.backward(grads[idx]));
    }

    apply(fn) {
        return new Tensor(this.data.map(fn), this.shp, this.autograd);
    }

    shpEquals(other) {
        return JSON.stringify(this.shp) === JSON.stringify(other.shp);
    }

    validateShape(other, operation) {
        if (!(operation === 'add' ? this.shpEquals(other) : this.shp[1] === other.shp[0])) {
            throw new Error(`Invalid shps for operation: ${operation}`);
        }
    }
}

const operations = {
    add: {
        forward: (a, b) => a.data.map((v, i) => v + b.data[i]),
        backward: grad => [grad, grad]
    },
    mm: {
        forward: (a, b) => A(a.shp[0] * b.shp[1], idx =>
            A(a.shp[1], k => a.data[Math.floor(idx / b.shp[1]) * a.shp[1] + k] * b.data[k * b.shp[1] + idx % b.shp[1]])
                .reduce((acc, val) => acc + val, 0)),
        backward: (grad, a, b) => [
            A(a.shp[0] * a.shp[1], idx =>
                A(b.shp[1], j => grad[Math.floor(idx / a.shp[1]) * b.shp[1] + j] * b.data[(idx % a.shp[1]) * b.shp[1] + j])
                    .reduce((acc, val) => acc + val, 0)),
            A(b.shp[0] * b.shp[1], idx =>
                A(a.shp[0], i => grad[i * b.shp[1] + idx % b.shp[1]] * a.data[i * a.shp[1] + Math.floor(idx / b.shp[1])])
                    .reduce((acc, val) => acc + val, 0))
        ]
    },
    relu: {
        forward: a => a.data.map(x => Math.max(0, x)),
        backward: (grad, a) => [grad.map((g, i) => a.data[i] > 0 ? g : 0)]
    },
    mse: {
        forward: (a, b) => {
            const diff = a.data.map((v, i) => v - b.data[i]);
            return [diff.reduce((sum, d) => sum + d * d, 0) / a.data.length];
        },
        backward: (grad, a, b) => {
            const diff = a.data.map((v, i) => v - b.data[i]);
            return [diff.map(d => 2 * d * grad[0] / a.data.length), diff.map(d => -2 * d * grad[0] / a.data.length)];
        }
    }
};

Object.entries(operations).forEach(([name, { forward }]) => {
    Tensor.prototype[name] = function(other) {
        this.validateShape(other, name);
        const result = new Tensor(forward(this, other), name === 'mm' ? [this.shp[0], other.shp[1]] : this.shp);
        result.setCreators([this, other], name);
        return result;
    };
});

Tensor.prototype.mul = function(scalar) {
    return this.apply(v => v * scalar);
};

class NeuralNet {
    constructor(layers) {
        this.layers = layers.map(({inputDim, outputDim}) => ({
            weights: Tensor.from([inputDim, outputDim], () => Math.random() * 0.01 - 0.005, true),
            bias: Tensor.from([1, outputDim], () => 0, true)
        }));
    }

    forward(input) {
        return this.layers.reduce((input, {weights, bias}) => input.mm(weights).add(bias).relu(), input);
    }
}
