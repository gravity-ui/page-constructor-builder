import React from 'react';

interface CustomBlockProps {
    title: string;
    content: string;
    className?: string;
    variant?: 'default' | 'primary' | 'secondary';
}

/**
 * Custom block component for the Page Constructor Builder
 * This demonstrates how to create custom components that can be used in YAML configurations
 */
export const CustomBlock: React.FC<CustomBlockProps> = ({
    title,
    content,
    className = '',
    variant = 'default',
}) => {
    const variantClass = `custom-block--${variant}`;

    return (
        <div className={`custom-block ${variantClass} ${className}`}>
            <h2>{title}</h2>
            <p>{content}</p>
        </div>
    );
};

export default CustomBlock;
