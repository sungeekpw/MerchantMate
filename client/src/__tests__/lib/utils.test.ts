import { cn } from '../../lib/utils';

describe('Utils Module', () => {
  describe('cn function', () => {
    it('should combine class names correctly', () => {
      const result = cn('class1', 'class2');
      expect(result).toBe('class1 class2');
    });

    it('should handle conditional classes', () => {
      const result = cn('base', true && 'conditional', false && 'hidden');
      expect(result).toBe('base conditional');
    });

    it('should merge Tailwind classes correctly', () => {
      const result = cn('p-4', 'p-6'); // p-6 should override p-4
      expect(result).toBe('p-6');
    });

    it('should handle undefined and null values', () => {
      const result = cn('base', undefined, null, 'valid');
      expect(result).toBe('base valid');
    });

    it('should handle empty strings', () => {
      const result = cn('base', '', 'valid');
      expect(result).toBe('base valid');
    });

    it('should handle arrays of classes', () => {
      const result = cn(['class1', 'class2'], 'class3');
      expect(result).toBe('class1 class2 class3');
    });

    it('should handle complex conditional logic', () => {
      const variant = 'primary';
      const size = 'large';
      const disabled = false;
      
      const result = cn(
        'base-button',
        variant === 'primary' && 'bg-blue-500',
        size === 'large' && 'px-6 py-3',
        disabled && 'opacity-50'
      );
      
      expect(result).toBe('base-button bg-blue-500 px-6 py-3');
    });

    it('should handle object-style classes', () => {
      const result = cn({
        'active': true,
        'disabled': false,
        'primary': true
      });
      
      expect(result).toBe('active primary');
    });
  });
});