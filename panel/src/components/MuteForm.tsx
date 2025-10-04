import { forwardRef, useImperativeHandle, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { parseDuration } from '@/lib/duration';


const MuteFormSchema = z.object({
    duration: z.string().optional(),
    reason: z.string(),
});

export type MuteFormType = {
    getData: () => {
        reason: string;
        duration: string;
    };
    focusReason: () => void;
};

type MuteFormProps = {
    disabled: boolean;
    onNavigateAway: () => void;
};

const MuteForm = forwardRef<MuteFormType, MuteFormProps>(({ disabled, onNavigateAway }, ref) => {
    const form = useForm<z.infer<typeof MuteFormSchema>>({
        resolver: zodResolver(MuteFormSchema),
        defaultValues: {
            duration: '2h',
            reason: '',
        },
    });
    const reasonRef = useRef<HTMLTextAreaElement>(null);

    useImperativeHandle(ref, () => ({
        getData: () => {
            const { reason, duration } = form.getValues();
            return { reason, duration: duration || '0' };
        },
        focusReason: () => {
            reasonRef.current?.focus();
        }
    }));

    const onDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const parsed = parseDuration(e.target.value, 'm');
        form.setValue('duration', parsed.text);
    };

    return (
        <Form {...form}>
            <form className="space-y-4">
                <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Duration</FormLabel>
                            <FormControl>
                                <Input
                                    {...field}
                                    placeholder="ex: 2h, 1d, 30m. Leave empty for permanent."
                                    disabled={disabled}
                                    onBlur={onDurationChange}
                                />
                            </FormControl>
                            <FormDescription>
                                Max duration is 3 days.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Reason</FormLabel>
                            <FormControl>
                                <Textarea
                                    {...field}
                                    ref={reasonRef}
                                    placeholder="Enter a reason for the mute."
                                    disabled={disabled}
                                    className="h-24"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </form>
        </Form>
    );
});

export default MuteForm;