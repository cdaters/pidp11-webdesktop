"""Small original PDP-11 word builder shared by isolated device tests."""
import time

class Program:
    """Tiny label-resolving word builder; retain the emitted octal listing."""
    def __init__(self):
        self.words = []
        self.labels = {}
        self.fixups = []

    def emit(self, *words):
        self.words.extend(words)

    def label(self, name):
        self.labels[name] = len(self.words)

    def branch(self, opcode, target):
        self.fixups.append((len(self.words), opcode, target))
        self.emit(0)

    def finish(self):
        for index, opcode, target in self.fixups:
            delta = self.labels[target] - index - 1
            assert -128 <= delta <= 127
            self.words[index] = opcode | (delta & 255)
        return self.words

def execute(sim, program, name, root):
    listing = []
    for index, word in enumerate(program.finish()):
        address = 0o1000 + 2 * index
        listing.append(f'{address:06o}: {word:06o}')
        sim.command(f'deposit {address:o} {word:o}')
    (root / (name + '.words.txt')).write_text('\n'.join(listing) + '\n')
    output = sim.command('go 1000')
    deadline = time.monotonic() + 8
    while 'HALT instruction' not in output and time.monotonic() < deadline:
        output += sim.read(.1)
    assert 'HALT instruction' in output, output
    return output

