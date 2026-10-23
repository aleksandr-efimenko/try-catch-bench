def plain(n):
    total = 0
    for i in range(n):
        total += i & 7
    return total


def guarded(n):
    total = 0
    for i in range(n):
        try:
            total += i & 7
        except ValueError:
            total = -1
    return total


def throwing(n):
    total = 0
    for i in range(n):
        try:
            raise ValueError("bad input")
        except ValueError:
            total += i & 7
    return total
