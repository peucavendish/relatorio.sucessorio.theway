import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SectionHeaderProps {
    icon: LucideIcon;
    title: string;
    description: string;
    iconColor?: string;
    iconBgColor?: string;
    className?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
    icon: Icon,
    title,
    description,
    iconColor = "text-accent",
    iconBgColor = "bg-accent/10",
    className
}) => {
    return (
        <div className={cn("section-header", className)}>
            <div className="inline-block">
                <div className="card-flex-center mb-4">
                    <div className={cn("section-header-icon", iconBgColor)}>
                        <Icon size={28} className={iconColor} />
                    </div>
                </div>
                <h2 className="section-header-title">{title}</h2>
                <p className="section-header-description">
                    {description}
                </p>
            </div>
        </div>
    );
};

export default SectionHeader;
