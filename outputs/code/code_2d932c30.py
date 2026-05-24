def sort_list(input_list, reverse=False):
    """
    Sorts a list in ascending order by default.
    
    Args:
        input_list (list): The list to be sorted.
        reverse (bool): If True, sorts in descending order. Default is False.
    
    Returns:
        list: A new sorted list (does not modify the original).
    """
    if not isinstance(input_list, list):
        raise TypeError("Input must be a list")
    
    return sorted(input_list, reverse=reverse)