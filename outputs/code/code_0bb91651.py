def fibonacci(n: int) -> int:
    """
    Calculate the nth Fibonacci number using an iterative approach.

    Args:
        n: A non-negative integer indicating which Fibonacci number to compute.
           fibonacci(0) = 0, fibonacci(1) = 1.

    Returns:
        The nth Fibonacci number.

    Raises:
        ValueError: If n is negative.
    """
    if n < 0:
        raise ValueError("n must be a non-negative integer")
    if n == 0:
        return 0
    if n == 1:
        return 1

    a, b = 0, 1
    for _ in range(2, n + 1):
        a, b = b, a + b
    return b