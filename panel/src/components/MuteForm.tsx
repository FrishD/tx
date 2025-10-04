import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type MuteFormType = {
    getData: () => {
        reason: string;
        duration: string;
    };
    focusReason: () => void;
};

type MuteFormProps = {
    disabled: boolean;
};

const MuteForm = forwardRef<MuteFormType, MuteFormProps>(({ disabled }, ref) => {
    const reasonRef = useRef<HTMLTextAreaElement>(null);
    const customMultiplierRef = useRef<HTMLInputElement>(null);
    const [currentDuration, setCurrentDuration] = useState('2 hours');
    const [customUnits, setCustomUnits] = useState('hours');

    useImperativeHandle(ref, () => ({
        getData: () => {
            const reason = reasonRef.current?.value.trim() ?? '';
            let duration;
            if (currentDuration === 'custom') {
                const multi = customMultiplierRef.current?.value || '0';
                duration = `${multi} ${customUnits}`;
            } else {
                duration = currentDuration;
            }
            return { reason, duration };
        },
        focusReason: () => {
            reasonRef.current?.focus();
        }
    }));

    return (
        <div className="space-y-4">
            <div>
                <Label htmlFor="durationSelect">Duration</Label>
                <div className="mt-1 space-y-1">
                    <Select
                        onValueChange={setCurrentDuration}
                        value={currentDuration}
                        disabled={disabled}
                    >
                        <SelectTrigger id="durationSelect" className="tracking-wide">
                            <SelectValue placeholder="Select Duration" />
                        </SelectTrigger>
                        <SelectContent className="tracking-wide">
                            <SelectItem value="custom" className="font-bold">Custom (set below)</SelectItem>
                            <SelectItem value="5 minutes">5 MINUTES</SelectItem>
                            <SelectItem value="30 minutes">30 MINUTES</SelectItem>
                            <SelectItem value="2 hours">2 HOURS</SelectItem>
                            <SelectItem value="1 day">1 DAY</SelectItem>
                            <SelectItem value="3 days">3 DAYS</SelectItem>
                        </SelectContent>
                    </Select>
                    <div className="flex flex-row gap-2">
                        <Input
                            id="durationMultiplier"
                            type="number"
                            placeholder="15"
                            required
                            disabled={currentDuration !== 'custom' || disabled}
                            ref={customMultiplierRef}
                        />
                        <Select
                            onValueChange={setCustomUnits}
                            value={customUnits}
                            disabled={currentDuration !== 'custom' || disabled}
                        >
                            <SelectTrigger
                                className="tracking-wide"
                                id="durationUnits"
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="tracking-wide">
                                <SelectItem value="minutes">MINUTES</SelectItem>
                                <SelectItem value="hours">HOURS</SelectItem>
                                <SelectItem value="days">DAYS</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>
            <div>
                <Label htmlFor="muteReason">Reason</Label>
                <Textarea
                    id="muteReason"
                    ref={reasonRef}
                    placeholder="Enter a reason for the mute."
                    disabled={disabled}
                    className="h-24 mt-1"
                />
            </div>
        </div>
    );
});

export default MuteForm;