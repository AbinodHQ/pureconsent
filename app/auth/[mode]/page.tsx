import {notFound} from 'next/navigation';
import {AuthForm} from '@/components/auth-form';
export const metadata={referrer:'no-referrer'};
export default async function Page({params}:{params:Promise<{mode:string}>}){const {mode}=await params;if(!['signup','login','forgot','reset','verify','resend'].includes(mode))notFound();return <AuthForm mode={mode}/>;}
