
-- Admin policies for pill_reference
CREATE POLICY "Admins can insert pill references"
ON public.pill_reference FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update pill references"
ON public.pill_reference FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete pill references"
ON public.pill_reference FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin policies for education_posts
CREATE POLICY "Admins can insert education posts"
ON public.education_posts FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update education posts"
ON public.education_posts FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete education posts"
ON public.education_posts FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
