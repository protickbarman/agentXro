def fibonacci(n):
    """
    Calculate the Fibonacci sequence up to the nth term.
    
    Args:
        n (int): The number of terms to generate (must be non-negative)
    
    Returns:
        list: A list containing the Fibonacci sequence from 0 to nth term
    """
    if n < 0:
        raise ValueError("n must be a non-negative integer")
    elif n == 0:
        return [0]
    elif n == 1:
        return [0, 1]
    
    sequence = [0, 1]
    for i in range(2, n + 1):
        next_term = sequence[i-1] + sequence[i-2]
        sequence.append(next_term)
    
    return sequence

# Alternative: Generator version for memory efficiency with large sequences
def fibonacci_generator(n):
    """
    Generate Fibonacci numbers up to the nth term using a generator.
    More memory-efficient for large values of n.
    """
    a, b = 0, 1
    for _ in range(n + 1):
        yield a
        a, b = b, a + b